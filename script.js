const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const demosSection = document.getElementById('demos');
const enableWebcamButton = document.getElementById('webcamButton');
const captureButton = document.getElementById('captureButton');
const flashlightButton = document.getElementById('flashlightButton');
let flashlightActive = false;
let currentCamera = 'environment'; // Default to back camera
let isDetecting = false;  // Track if detection is active
let predictions = [];  // Store predictions for use when capturing the image

// Check if webcam access is supported.
function getUserMediaSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Toggle detection mode
function toggleDetection() {
  if (isDetecting) {
    stopDetection();
  } else {
    startDetection();
  }
}

function startDetection() {
  isDetecting = true;
  enableWebcamButton.innerText = "Stop Detecting";
  captureButton.style.display = 'block';
  flashlightButton.style.display = 'block';

  // getUsermedia parameters to force video (back camera) but not audio.
  const constraints = {
    video: {
      facingMode: currentCamera, // Use the current camera (back/front)
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

function stopDetection() {
  isDetecting = false;
  enableWebcamButton.innerText = "Start Detecting";
  captureButton.style.display = 'none';
  flashlightButton.style.display = 'none';

  // Stop the webcam stream.
  const stream = video.srcObject;
  const tracks = stream.getTracks();
  tracks.forEach(track => track.stop());
  video.srcObject = null;
}

function predictWebcam() {
  // Now let's start classifying a frame in the stream.
  model.detect(video).then(function (predictionsResult) {
    predictions = predictionsResult;  // Store predictions for use when capturing

    // Loop through predictions and draw bounding boxes if confidence is high.
    liveView.innerHTML = '';  // Clear previous predictions

    for (let n = 0; n < predictions.length; n++) {
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
      }
    }

    // Call this function again to keep predicting when the browser is ready.
    if (isDetecting) {
      window.requestAnimationFrame(predictWebcam);
    }
  });
}

// Capture button functionality to save the image with bounding boxes
captureButton.addEventListener('click', function() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Set canvas size to match the video feed
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  // Draw the current video frame onto the canvas
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Draw the bounding boxes and labels on the canvas
  predictions.forEach(function(prediction) {
    if (prediction.score > 0.66) {
      const bbox = prediction.bbox;
      context.beginPath();
      context.rect(bbox[0], bbox[1], bbox[2], bbox[3]);
      context.lineWidth = 2;
      context.strokeStyle = 'red';
      context.fillStyle = 'red';
      context.stroke();
      context.fillText(prediction.class, bbox[0], bbox[1] - 10);
    }
  });

  // Create a download link for the image
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'object-detection.png';
  link.click();
});

// Toggle flashlight on/off
flashlightButton.addEventListener('click', function() {
  flashlightActive = !flashlightActive;
  const videoTrack = video.srcObject.getVideoTracks()[0];

  if (videoTrack && videoTrack.getCapabilities().torch) {
    videoTrack.applyConstraints({
      advanced: [{ torch: flashlightActive }]
    }).then(() => {
      flashlightButton.innerText = flashlightActive ? 'Turn Flashlight Off' : 'Turn Flashlight On';
    }).catch(err => console.error('Error toggling flashlight:', err));
  }
});

// Switch between 3x/1x camera
function switchCamera() {
  currentCamera = currentCamera === 'environment' ? 'user' : 'environment'; // Switch between front/back camera
  if (isDetecting) {
    stopDetection();
    startDetection(); // Restart webcam with new camera
  }
}

demosSection.classList.remove('invisible');
// Store the resulting model in the global scope of our app.
var model = undefined;

// Load the COCO-SSD model.
cocoSsd.load().then(function (loadedModel) {
  model = loadedModel;
  // Show demo section once the model is ready to use.
  demosSection.classList.remove('invisible');
});
