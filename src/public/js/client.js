/* global config */

var pollIntervalID;
var appState = {
  mySlot: {
    id: config.id,
    status: {},
    message: null
  },
  slots: []
};
var gPixelNodes;
var gPixels;
var gBuzzTrack;

ACTIVE_POLL_INTERVAL = 2000;
INACTIVE_POLL_INTERVAL = 15000;
var gPollInterval = ACTIVE_POLL_INTERVAL;
/*
an example of the slots array
[
  null,
  {
    id: "5",
    status: {
      value: 1,
      last-modified: ''
    }
  },
  {id: "2", status: null},
  {id: "6", status: {...}},
  null,
  {id: "3", status: {...}}
]
*/

function jsonRequest(url, requestConfig) {
  // thin wrapper around fetch, to ensure errors go down the resolved path
  url = config.apiOrigin + '/' + url;

  var promise = new Promise(function(resolve, reject) {
    var fetched = window.fetch(url, requestConfig);
    fetched.catch(function(err) {
        // network or permissions error?
        console.warn('jsonRequest errback, request for %s produced error', url, err);
        resolve(null);
    });
    fetched.then(function(response) {
      return response.json().then(function(data) {
        resolve(data);
      });
    });
  });
  return promise;
}

function init() {
  initRendering();
  initStatuses().then(startPolling);

  // pause if the window/tab loses visibility
  document.addEventListener("visibilitychange", function() {
    stopPolling();
    if (document.hidden) {
      SlotsAnimationManager.stop();
      gPollInterval = INACTIVE_POLL_INTERVAL;
      startPolling();
    } else {
      SlotsAnimationManager.start(SlotsAnimationManager.stateId);
      gPollInterval = ACTIVE_POLL_INTERVAL;
      startPolling();
    }
  });
}

function onBuzzClick() {
  gBuzzTrack.play(650);
}

function startPolling() {
  if (pollIntervalID) {
    return;
  }
  pollIntervalID = setInterval(fetchAndRenderSlots, gPollInterval);
}

function stopPolling() {
  clearInterval(pollIntervalID);
  pollIntervalID = null;
}

function initStatuses() {
  var statusPromise = jsonRequest('user/'+ config.id +'/status');
  var slotsPromise = jsonRequest('user/'+ config.id +'/slots');
  var initDataPromise = Promise.all([
    statusPromise, slotsPromise
  ]);

  initDataPromise.then(function (results) {
    var statusData = results[0];
    var slotsData = results[1];
    if (statusData) {
      statusData.didChange = true;
      appState.mySlot.status = statusData;
    } else {
      // got no data, now what?
    }
    if (slotsData) {
      appState.slots = slotsData.value.map(function(id){
        return {
          id: id,
          status: null
        };
      });
    }
  }).then(function() {
    return fetchAndRenderSlots();
  });

  initDataPromise.catch(function (errors) {
    console.warn('Encountered errors in init: ', errors);
  });
  return initDataPromise;
}

function setPixelNodeColor(node, color) {
  var colorStr;
  if ('h' in color) {
    // assume HSV
    var hsvColor = color;
    color = Color.HSVtoRGB(hsvColor);
  }
  var colorStr = 'rgb('+color.r.toFixed(0)+','+color.g.toFixed(0)+','+color.b.toFixed(0)+')';
  node.style.backgroundColor = colorStr;
}

function paintPixels() {
  for(var i=0; i<gPixels.length; i++) {
    setPixelNodeColor(gPixelNodes[i], gPixels[i].color);
  }
}

function initRendering() {
  var titleNode = document.querySelector('h1');
  if (titleNode) {
    titleNode.innerHTML = 'status client: ' + config.id;
  }
  gPixelNodes = document.querySelectorAll('#band > .slot > .led');

  // SlotsAnimationManager prepares a view-model for each slot (including self) we need to render
  gPixels = SlotsAnimationManager.initSlots(new Array(gPixelNodes.length));
  // give it a render function to be called each animation frame
  SlotsAnimationManager.render = paintPixels;
  // start calling render ~60fps
  SlotsAnimationManager.start();

  // toggle a class on the element
  gPixelNodes[0].classList.toggle('available', appState.mySlot.status.value === '1');

  // prepare the audio clip
  gBuzzTrack = new Track(document.getElementById('buzz'));
}

function fetchAndRenderSlots() {
  var fetchPromises = appState.slots.map(function(slot) {
    if (slot && ('id' in slot) && slot.id !== null) {
      return jsonRequest('user/'+ slot.id +'/status');
    } else {
      return Promise.resolve(null);
    }
  });
  var messagesFetched = jsonRequest('user/' + config.id + '/message');
  fetchPromises.push(messagesFetched);

  var fetched = Promise.all(fetchPromises);
  fetched.then(function(dataSet) {
    dataSet.forEach(function(data, idx, collection) {
      if (idx < collection.length - 1) {
        updateSlot(data, idx, appState.slots)
      } else {
        // my messages
        updateMessage(data);
      }
    });
  }).then(function() {
    renderApp();
  });
  fetched.catch(function(errors) {
    console.warn('fetchMySlots errback: ', errors);
  })
}
function updateMessage(messageData) {
  if (!messageData) {
    return;
  }
  var lastMessage = appState.mySlot.message;
  var didChange;
  var recentThreshold = 1000 * 30; // > 30s is a stale message
  var timeSent = (new Date(messageData['last-modified'])).getTime();
  if (!lastMessage ||
      (lastMessage.sender !== messageData.sender) ||
      (lastMessage['last-modified'] !== messageData['last-modified']))
  {
    if (Date.now() - timeSent <= recentThreshold) {
      appState.mySlot.message = messageData;
      var senderSlotIndex = appState.slots.map(function(slot) {
        return slot.id;
      }).indexOf(messageData.sender);
      // SlotsAnimationManager slots include 'self', so offset by 1
      SlotsAnimationManager.playMessage(messageData.value, senderSlotIndex+1);
      Buzz(650);
    }
  }
}

function updateSlot(newStatus, idx, collection) {
  var slot = collection[idx];
  // empty slot.
  if (!slot.status) {
    slot.status = {
      value: 0,
      didChange: true
    };
  }
  slot.empty = !!slot.id;
  var oldStatus = slot.status;
  if (!newStatus) {
    newStatus = oldStatus;
  }
  // keep an existing didChange value - we only reset when we render
  var didChange = oldStatus ? oldStatus.didChange : true;
  var lastModified = newStatus['last-modified'];
  if (!didChange) {
    // NOTE: we could consider a more recent last-modified as a change needing rendering
    if (newStatus.value !== oldStatus.value) {
      console.log('updateStatus with changed newStatus', newStatus);
      didChange = true;
    }
  } else {
    didChange = true;
  }
  if (didChange) {
    slot.status.value = newStatus.value;
    slot.status.lastModified = newStatus['last-modified'];
    slot.status.didChange = didChange;
  }
}

function renderApp() {
  // update the view model for the next tick
  var allSlots = [appState.mySlot].concat(appState.slots);
  allSlots.length = gPixelNodes.length;
  allSlots.forEach(function(slot, idx) {
    var didChange;
    if (!slot) {
      // empty slot
    } else if (slot.status && slot.status.didChange) {
      console.log('renderApp: change slot status: ', idx, slot);
      SlotsAnimationManager.changeSlotStatus(idx, slot.status.value === '1' ? 1 : 0);
      // reset dirty flag
      slot.status.didChange = false;
    }
    if (slot.messageSent) {
      var viewModelIndex = idx;
      SlotsAnimationManager.messageSentToSlot(viewModelIndex, slot.messageSent);
      delete slot.messageSent;
    }
  });
  // toggle a class on the containing element
  gPixelNodes[0].parentNode.classList.toggle('available', appState.mySlot.status.value === '1');
}

function toggleMyStatus() {
  var oldStatus = appState.mySlot.status || { value: '0' };
  var newStatus = {
    value: oldStatus.value === '1' ? '0' : '1'
  };
  // optimistically update locally, we'll roll it back if the request fails
  updateSlot(newStatus, 0, [appState.mySlot]);

  var fetchConfig = {
    method: 'PUT',
    headers: new Headers({
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify(newStatus)
  };

  // TODO: could fire and forget here as we're already getting regular updates from the server
  var statusUpdated = jsonRequest('user/'+ config.id +'/status', fetchConfig);
  statusUpdated.catch(function(error) {
    console.error('Could not update my status:', error);
    updateSlot(oldStatus, 0, [appState.mySlot]);
    renderApp();
  });

  renderApp();

  if (newStatus.value === '1') {
    startPolling();
  } else {
    stopPolling();
  }
}

function sendMessage(idx) {
  var slot = appState.slots[idx];
  var myActive = appState.mySlot.status.value === '1';
  if (!(myActive && slot && slot.status && slot.status.value === '1')) {
    return;
  }
  if (!slot.id) {
    console.warn('sendMessage: no id for user at slot: ', slot);
    return;
  }
  var message = {
    value: ""+MessageType.rainbow,
    sender: ""+config.id
  };
  // update the local model
  slot.messageSent = MessageType.rainbow; // the rainbow message

  var fetchConfig = {
    method: 'PUT',
    headers: new Headers({
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify(message)
  };
  var messageUpdated = jsonRequest('user/'+ slot.id +'/message', fetchConfig);
  messageUpdated.catch(function(error) {
    console.error('Could not update message:', error);
    // TODO: trigger some error animation?
  });
  renderApp();
}

var MessageType = {
  'rainbow': 1
};
