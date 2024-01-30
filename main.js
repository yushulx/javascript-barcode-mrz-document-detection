let dropdown = document.getElementById("dropdown");
let barcode_checkbox = document.getElementById("barcode_checkbox");
let mrz_checkbox = document.getElementById("mrz_checkbox");
let document_checkbox = document.getElementById("document_checkbox");
let normalizer;
let reader;
let recognizer;
let isSDKReady = false;
let canvas = document.getElementById('canvas');
let img = new Image();
let image_file = document.getElementById('image_file');

canvas.addEventListener('dragover', function (event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
}, false);

canvas.addEventListener('drop', function (event) {
    event.preventDefault();
    if (event.dataTransfer.files.length > 0) {
        let file = event.dataTransfer.files[0];
        if (file.type.match('image.*')) {
            let reader = new FileReader();
            reader.onload = function (e) {
                loadImage2Canvas(e.target.result);
            };
            reader.readAsDataURL(file);
        } else {
            alert("Please drop an image file.");
        }
    }
}, false);

function selectChanged() {
    switchProduct(dropdown.value)
}

function loadImage2Canvas(base64Image) {
    image_file.src = base64Image;
    img.src = base64Image;
    img.onload = function () {
        let width = img.width;
        let height = img.height;

        let canvas = document.getElementById('canvas');
        canvas.width = width;
        canvas.height = height;

        detect();
    };

}

document.addEventListener('paste', (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;

    for (index in items) {
        const item = items[index];
        if (item.kind === 'file') {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (event) => {
                loadImage2Canvas(event.target.result);
            };
            reader.readAsDataURL(blob);
        }
    }
});

function switchProduct(name) {
    if (name === 'file') {
        let divElement = document.getElementById("file_container");
        divElement.style.display = "block";

        divElement = document.getElementById("camera_container");
        divElement.style.display = "none";
    }
    else {
        let divElement = document.getElementById("camera_container");
        divElement.style.display = "block";

        divElement = document.getElementById("file_container");
        divElement.style.display = "none";
    }
}

async function activate() {
    toggleLoading(true);
    let divElement = document.getElementById("license_key");
    let licenseKey = divElement.value == "" ? divElement.placeholder : divElement.value;

    try {
        Dynamsoft.DBR.BarcodeScanner.license = licenseKey;
        Dynamsoft.DDN.DocumentNormalizer.license = licenseKey;
        Dynamsoft.DLR.LabelRecognizer.license = licenseKey;

        await Dynamsoft.DBR.BarcodeReader.loadWasm();
        await Dynamsoft.DLR.LabelRecognizer.loadWasm();
        await Dynamsoft.DDN.DocumentNormalizer.loadWasm();

        reader = await Dynamsoft.DBR.BarcodeReader.createInstance();
        reader.ifSaveOriginalImageInACanvas = true;

        normalizer = await Dynamsoft.DDN.DocumentNormalizer.createInstance();

        recognizer = await Dynamsoft.DLR.LabelRecognizer.createInstance();
        recognizer.ifSaveOriginalImageInACanvas = true;
        await recognizer.updateRuntimeSettingsFromString("MRZ");

        isSDKReady = true;
    }
    catch (ex) {
        console.error(ex);
    }

    toggleLoading(false);
}

function toggleLoading(isLoading) {
    if (isLoading) {
        document.getElementById("loading-indicator").style.display = "flex";
    }
    else {
        document.getElementById("loading-indicator").style.display = "none";
    }
}

document.getElementById("pick_file").addEventListener("change", function () {
    let currentFile = this.files[0];
    if (currentFile == null) {
        return;
    }
    var fr = new FileReader();
    fr.onload = function () {
        loadImage2Canvas(fr.result);
    }
    fr.readAsDataURL(currentFile);
});

async function detect() {
    if (!isSDKReady) {
        alert("Please activate the SDK first.");
        return;
    }
    toggleLoading(true);

    let detection_result = document.getElementById('detection_result');
    detection_result.innerHTML = "";
    let context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (barcode_checkbox.checked) {
        let barcodeResults = await reader.decode(img);
        if (barcodeResults.length > 0) {
            let txts = [];
            for (var i = 0; i < barcodeResults.length; ++i) {
                txts.push(barcodeResults[i].barcodeText);
                localization = barcodeResults[i].localizationResult;
                text = barcodeResults[i].barcodeText;

                // Draw overlay
                context.beginPath();
                context.strokeStyle = '#ff0000';
                context.lineWidth = 2;
                context.moveTo(localization.x1, localization.y1);
                context.lineTo(localization.x2, localization.y2);
                context.lineTo(localization.x3, localization.y3);
                context.lineTo(localization.x4, localization.y4);
                context.lineTo(localization.x1, localization.y1);
                context.stroke();

                context.font = '18px Verdana';
                context.fillStyle = '#ff0000';
                let x = [localization.x1, localization.x2, localization.x3, localization.x4];
                let y = [localization.y1, localization.y2, localization.y3, localization.y4];
                x.sort(function (a, b) {
                    return a - b;
                });
                y.sort(function (a, b) {
                    return b - a;
                });
                let left = x[0];
                let top = y[0];

                context.fillText(text, left, top + 50);
            }
            detection_result.innerHTML += txts.join(', ') + '\n';
        }
    }

    if (mrz_checkbox.checked) {
        let mrzResults = await recognizer.recognize(img);
        let txts = [];
        for (let result of mrzResults) {
            for (let line of result.lineResults) {
                let text = line.text;
                let points = line.location.points;
                // Draw overlay
                context.beginPath();
                context.strokeStyle = '#0000ff';
                context.lineWidth = 2;
                context.moveTo(points[0].x, points[0].y);
                context.lineTo(points[1].x, points[1].y);
                context.lineTo(points[2].x, points[2].y);
                context.lineTo(points[3].x, points[3].y);
                context.lineTo(points[0].x, points[0].y);
                context.stroke();

                context.font = '18px Verdana';
                context.fillStyle = '#ff0000';
                let x = [points[0].x, points[1].x, points[0].x, points[0].x];
                let y = [points[0].y, points[1].y, points[0].y, points[0].y];
                x.sort(function (a, b) {
                    return a - b;
                });
                y.sort(function (a, b) {
                    return b - a;
                });
                let left = x[0];
                let top = y[0];

                context.fillText(text, left, top);
                txts.push(text);
            }
        }

        if (txts.length == 2) {
            detection_result.innerHTML += JSON.stringify(mrzParseTwoLine(txts[0], txts[1])) + '\n';
        }
        else if (txts.length == 3) {
            detection_result.innerHTML += JSON.stringify(mrzParseThreeLine(txts[0], txts[1], txts[2])) + '\n';
        }
    }

    if (document_checkbox.checked) {
        let documentResults = await normalizer.detectQuad(img);

        if (documentResults.length > 0) {
            let quad = documentResults[0];
            let points = quad.location.points;

            // Draw overlay
            context.strokeStyle = "#00ff00";
            context.lineWidth = 2;
            for (let i = 0; i < points.length; i++) {
                context.beginPath();
                context.arc(points[i].x, points[i].y, 5, 0, 2 * Math.PI);
                context.stroke();
            }
            context.beginPath();
            context.moveTo(points[0].x, points[0].y);
            context.lineTo(points[1].x, points[1].y);
            context.lineTo(points[2].x, points[2].y);
            context.lineTo(points[3].x, points[3].y);
            context.lineTo(points[0].x, points[0].y);
            context.stroke();

            let x = [points[0].x, points[1].x, points[0].x, points[0].x];
            let y = [points[0].y, points[1].y, points[0].y, points[0].y];
            x.sort(function (a, b) {
                return a - b;
            });
            y.sort(function (a, b) {
                return b - a;
            });
            let left = x[0];
            let top = y[0];
            context.font = '18px Verdana';
            context.fillStyle = '#00ff00';
            context.fillText('Detected document', left, top);
        }
    }
    toggleLoading(false);
}

function scan() {

}