const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const captureButton = document.getElementById('captureImage');
const flashlightButton = document.getElementById('toggleFlashlight');
const switchCameraButton = document.getElementById('switchCamera'); // Added switch camera button
const toggleDetectionButton = document.getElementById('toggleDetection');
const capturedImageContainer = document.getElementById('capturedImageContainer'); // Container for captured image
const capturedImage = document.getElementById('capturedImage');  // The img element to display captured image.


let flashlightActive = false;
let currentCamera = 'environment'; // Default to back camera ('user' for front)
let model = undefined; //  model variable
let stream = null;  //  store the webcam stream
let detectionActive = false; //Flag to control detection


// Check if webcam access is supported.
function getUserMediaSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}



// If webcam supported, add event listener to button for when user
if (getUserMediaSupported()) {
    toggleDetectionButton.addEventListener('click', toggleDetection);  // Use toggleDetection function

} else {
  console.warn('getUserMedia() is not supported by your browser');
  alert('getUserMedia() is not supported by your browser');
}



function toggleDetection() {
    if (!model) {
        return; // Model not loaded yet.
    }

    if (detectionActive) {
        stopDetection();
    } else {
        startDetection();
    }
}


function startDetection() {
    detectionActive = true;
    toggleDetectionButton.innerText = 'Stop Detecting';
    captureButton.style.display = 'inline-block';      // Show buttons
    flashlightButton.style.display = 'inline-block';
    switchCameraButton.style.display = 'inline-block'; // Show switch camera button
    capturedImageContainer.style.display = 'none';    // Ensure captured image container is hidden
    capturedImage.src = '';                              // Clear any previous image
    liveView.style.display = 'block';                   // Show live view


    const constraints = {
        video: {
            facingMode: currentCamera, // Use the current camera
            width: { ideal: 1280 },    // Ideal width
            height: { ideal: 720 }     // Ideal height
        }
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(mediaStream) {
            stream = mediaStream;  // Store the stream
            video.srcObject = stream;
            video.addEventListener('loadeddata', predictWebcam);
        })
        .catch(function(err) {
            console.error('Error accessing the webcam:', err);
            alert('Error accessing the webcam: ' + err.message);
            stopDetection(); //  stopDetection if there's an error
        });
}



function stopDetection() {
    detectionActive = false;
    toggleDetectionButton.innerText = 'Start Detecting';
    captureButton.style.display = 'none';
    flashlightButton.style.display = 'none';
    switchCameraButton.style.display = 'none';


    if (stream) {
        stream.getTracks().forEach(track => track.stop()); //  stop all tracks
        stream = null; //  clear the stream
    }
    video.srcObject = null;


    // Remove bounding boxes
    for (let i = 0; i < children.length; i++) {
        liveView.removeChild(children[i]);
    }
    children.length = 0;  // Clear the children array
}



var children = [];

function predictWebcam() {
    if (!detectionActive) {
        return; // Stop if detection is not active
    }

  // Now let's start classifying a frame in the stream.
  model.detect(video).then(function (predictions) {
    // Remove any previous bounding box highlights.
    for (let i = 0; i < children.length; i++) {
      liveView.removeChild(children[i]);
    }
    children.length = 0; //  clear the array


    // Loop through predictions and draw bounding boxes
    for (let n = 0; n < predictions.length; n++) {
      if (predictions[n].score > 0.66) {
        const p = document.createElement('p');
        p.innerText = predictions[n].class + ' - with '
            + Math.round(parseFloat(predictions[n].score) * 100)
            + '% confidence.';
        // Position the text at the top left of the bounding box.
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

// Capture button functionality
captureButton.addEventListener('click', function() {

    if (!detectionActive) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw bounding boxes and labels onto the canvas.
    children.forEach(child => {
        if (child.tagName === 'DIV') { //  highlighter divs
            context.beginPath();
            context.rect(
              parseFloat(child.style.left),
              parseFloat(child.style.top),
              parseFloat(child.style.width),
              parseFloat(child.style.height)
            );
            context.lineWidth = 2;
            context.strokeStyle = 'red';
            context.stroke();
        } else if(child.tagName === "P"){
            context.font = '16px Arial';
            context.fillStyle = 'red';
            context.fillText(child.innerText, parseFloat(child.style.marginLeft), parseFloat(child.style.marginTop));

        }
    });

    //  display the captured image.
    capturedImage.src = canvas.toDataURL('image/png');
    capturedImageContainer.style.display = 'block'; // Show the container
    liveView.style.display = 'none';      //hide live view

     // Stop the webcam stream after capture.
    stopDetection();
});


// Toggle flashlight on/off
flashlightButton.addEventListener('click', function() {

    if (!stream) return; // No stream

  flashlightActive = !flashlightActive;
  const videoTrack = stream.getVideoTracks()[0];

  if (videoTrack && videoTrack.getCapabilities().torch) {
    videoTrack.applyConstraints({
      advanced: [{ torch: flashlightActive }]
    }).then(() => {
      flashlightButton.innerText = flashlightActive ? 'Turn Flashlight Off' : 'Turn Flashlight On';
    }).catch(err => {
        console.error('Error toggling flashlight:', err);
        alert("Error toggling flashlight: " + err.message);  //  alert the error
    });
  } else {
        alert("Flashlight not supported on this device or camera.");
  }
});

// Switch between front/back camera
switchCameraButton.addEventListener('click', function() {
    if (!stream) return;

  currentCamera = currentCamera === 'environment' ? 'user' : 'environment';
  stopDetection();       //  stop the current stream
  startDetection();     // Restart with new camera
});



// Load the COCO-SSD model *before* attempting to use it.
cocoSsd.load().then(function (loadedModel) {
  model = loadedModel;
  //  remove the invisible class *after* the model has loaded.
  //demosSection.classList.remove('invisible'); //  remove the invisible class, if you had one.
   console.log("Model loaded successfully!"); //  check that the model is loaded.
});
