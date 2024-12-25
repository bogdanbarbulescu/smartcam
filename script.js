const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const demosSection = document.getElementById('demos');
const enableWebcamButton = document.getElementById('webcamButton');
const captureButton = document.getElementById('captureButton');

// Check if webcam access is supported.
function getUserMediaSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// If webcam supported, add event listener to button for when user
// wants to activate it to call enableCam function which we will 
// define in the next step.
if (getUserMediaSupported()) {
  enableWebcamButton.addEventListener('click', enableCam);
} else {
  console.warn('getUserMedia() is not supported by your browser');
}

// Enable the live webcam view and start classification.
function enableCam(event) {
  // Only continue if the COCO-SSD has finished loading.
  if (!model) {
    return;
  }

  // Hide the button once clicked.
  event.target.classList.add('removed');
  captureButton.style.display = 'block';

  // getUsermedia parameters to force video (back camera) but not audio.
  const constraints = {
    video: {
      facingMode: 'environment', // Request the back camera
      width: { ideal: 1280 },    // Ideal width
      height: { ideal: 720 }     // Ideal height
    }
  };

  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    video.srcObject = stream;
    video.addEventListener('loadeddata', predictWebcam);
  });
}

var children = [];

function predictWebcam() {
  // Now let's start classifying a frame in the stream.
  model.detect(video).then(function (predictions) {
    // Remove any previous bounding box highlights.
    for (let i = 0; i < children.length; i++) {
      liveView.removeChild(children[i]);
    }
    children.splice(0);

    // Loop through predictions and draw bounding boxes if confidence is high.
    for (let n = 0; n < predictions.length; n++) {
      // If the prediction confidence is greater than 66%, draw it
      if (predictions[n].score > 0.66) {
        const p = document.createElement('p');
        p.innerText = predictions[n].class + ' - with ' 
            + Math.round(parseFloat(predictions[n].score) * 100) 
            + '% confidence.';
        p.style = 'margin-left: ' + predictions[n].bbox[0] + 'px; margin-top: '
            + (predictions[n].bbox[1] - 10) + 'px; width: ' 
            + (predictions[n].bbox[2] - 10) + 'px; top: 0; left: 0;';

        const highlighter = document.createElement('div');
        highlighter.setAttribute('class', 'highlighter');
        highlighter.style = 'left: ' + predictions[n].bbox[0] + 'px; top: '
            + predictions[n].bbox[1] + 'px; width: ' 
            + predictions[n].bbox[2] + 'px; height: '
            + predictions[n].bbox[3] + 'px;';

        liveView.appendChild(highlighter);
        liveView.appendChild(p);
        children.push(highlighter);
        children.push(p);
      }
    }

    // Call this function again to keep predicting when the browser is ready.
    window.requestAnimationFrame(predictWebcam);
  });
}

// Capture button functionality to download the image with bounding boxes
captureButton.addEventListener('click', function() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Set canvas size to match the video feed
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  // Draw the current video frame onto the canvas
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Draw the bounding boxes and labels on the canvas
  children.forEach(function(child, index) {
    const p = child.previousSibling;
    const bbox = child.style;
    context.beginPath();
    context.rect(parseFloat(bbox.left), parseFloat(bbox.top), parseFloat(bbox.width), parseFloat(bbox.height));
    context.lineWidth = 2;
    context.strokeStyle = 'red';
    context.fillStyle = 'red';
    context.stroke();
    context.fillText(p.innerText, parseFloat(bbox.left), parseFloat(bbox.top) - 10);
  });

  // Create a download link for the image
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'object-detection.png';
  link.click();
});

demosSection.classList.remove('invisible');
// Store the resulting model in the global scope of our app.
var model = undefined;

// Load the COCO-SSD model.
cocoSsd.load().then(function (loadedModel) {
  model = loadedModel;
  // Show demo section once the model is ready to use.
  demosSection.classList.remove('invisible');
});
