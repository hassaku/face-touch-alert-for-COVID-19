const canvas = document.getElementById('hand-canvas');
const context = canvas.getContext('2d');
const video = document.getElementById('video');

let handModel;
let startedTrackingAt = null;
let touched = false;

const init = async () => {
  Push.Permission.request();

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      width: 640,
      height: 480
    }
  });

  try {
    video.srcObject = stream;
  } catch (err) {
    video.src = window.URL.createObjectURL(stream);
  }

  await faceapi.nets.tinyFaceDetector.load("models/");

  const options = {
    flipHorizontal: false,
    maxNumBoxes: 3,
    iouThreshold: 0.5,
    scoreThreshold: 0.7,
  };

  handTrack.load(options).then(l_model => {
    handModel = l_model;
    handTrack.startVideo(video).then(function (status) {
      console.log("START");
      processFrames();
    });
  });

  document.getElementById('message').innerText = 'Running!';
}

function intersectRect(r1, r2) {
  return !(r2.left > r1.right || r2.right < r1.left || r2.top > r1.bottom || r2.bottom < r1.top);
}

async function processFrames() {
  const faceResult = await processFaceTracking();
  const handResult = await processHandTracking();

  //console.log("face", faceResult);
  //console.log("hand", handResult);

  context.clearRect(0, 0, canvas.width, canvas.height);

  if (handResult.length > 0) {
    for (let i = 0; i < handResult.length; i++) {
      context.beginPath();
      context.lineWidth = 3;
      context.strokeStyle = "rgba(255, 0, 0, 0.6)";
      context.rect(...handResult[i].bbox);
      context.stroke();
    }
  }

  if (faceResult) {
    const faceBox = {
      left: faceResult.relativeBox.left * video.width,
      right: faceResult.relativeBox.right * video.width,
      top: faceResult.relativeBox.top * video.height,
      bottom: faceResult.relativeBox.bottom * video.height
    };

    context.beginPath();
    context.lineWidth = 3;
    context.strokeStyle = "rgba(0, 255, 0, 0.6)";
    context.rect(faceBox.left, faceBox.top, faceBox.right - faceBox.left, faceBox.bottom - faceBox.top);
    context.stroke();

    if (handResult.length > 0) {
      for (let i = 0; i < handResult.length; i++) {
        const bbox = handResult[i].bbox
        const handBox = {
          left: bbox[0],
          right: bbox[0] + bbox[2],
          top: bbox[1],
          bottom: bbox[1] + bbox[3]
        };

        const touch = intersectRect(faceBox, handBox);
        if (touch) {
            console.log("TOUCHED:", touch);
        }
      }
    }
  }

  // ((new Date().getTime() - startedTrackingAt) / 1000.0)

  //Push.create("顔タッチ通知", { //タイトルの入力
  //  body: "顔を触りましたね", //内容の入力
  //  timeout: 5000, //通知が消えるタイミング
  //  onClick: function () {
  //    window.focus(); //「window」にフォーカスする
  //    this.close(); //通知を消す
  //  }
  //});

  requestAnimationFrame(processFrames);
}

async function processFaceTracking() {
  const inputSize = 512;
  const scoreThreshold = 0.5;
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize,
    scoreThreshold
  })

  const result = await faceapi.detectSingleFace(video, options);
  if (!result) {
    return null;
  }
  return result;

  // これのせいでチカチカする. videoとcanvasのサイズが同じなら不要なはず...
  //const faceTrackingDims = faceapi.matchDimensions(canvas, video, true);
  //const resizedResult = faceapi.resizeResults(result, faceTrackingDims);
  //return resizedResult;
}

async function processHandTracking() {
  const predictions = await handModel.detect(video);
  return predictions;
}
