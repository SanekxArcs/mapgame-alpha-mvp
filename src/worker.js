let intervalId = null;

onmessage = function (e) {
  const { action, updateInterval } = e.data;

  if (action === "start") {
    intervalId = setInterval(() => {
      postMessage({ type: "updatePosition" });
    }, updateInterval * 1000);
  } else if (action === "stop") {
    clearInterval(intervalId);
    intervalId = null;
  }
};
