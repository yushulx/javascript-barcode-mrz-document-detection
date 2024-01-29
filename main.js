let dropdown = document.getElementById("dropdown");
let barcode_checkbox = document.getElementById("barcode_checkbox");
let mrz_checkbox = document.getElementById("mrz_checkbox");
let document_checkbox = document.getElementById("document_checkbox");
let normalizer;
let reader;
let recognizer;
let isSDKReady = false;

document.getElementById('file_image').addEventListener('dragover', function (event) {
    event.dataTransfer.dropEffect = 'copy';
}, false);

document.getElementById('file_image').addEventListener('drop', function (event) {
    event.preventDefault();
    if (event.dataTransfer.files.length > 0) {
        let file = event.dataTransfer.files[0];
        if (file.type.match('image.*')) {
            let reader = new FileReader();
            reader.onload = function (e) {
                document.getElementById('file_image').src = e.target.result;
                document.getElementById('file_image').style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            alert("Please drop an image file.");
        }
    }
}, false);


function checkboxChanged() {
    detect();
}

function selectChanged() {
    switchProduct(dropdown.value)
}

document.addEventListener('paste', (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;

    for (index in items) {
        const item = items[index];
        if (item.kind === 'file') {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('file_image').src = event.target.result;
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

document.getElementById("image_file").addEventListener("change", function () {
    let currentFile = this.files[0];
    if (currentFile == null) {
        return;
    }
    var fr = new FileReader();
    fr.onload = function () {
        let image = document.getElementById('file_image');
        image.src = fr.result;
        detect();
    }
    fr.readAsDataURL(currentFile);
});

async function detect() {
    if (!isSDKReady) {
        alert("Please activate the SDK first.");
        return;
    }
    toggleLoading(true);
    let image = document.getElementById('file_image');
    let detection_result = document.getElementById('detection_result');

    if (barcode_checkbox.checked) {
        let barcodeResults = await reader.decode(image);
        detection_result.innerHTML += "<strong>Barcode</strong> <br>" + JSON.stringify(barcodeResults);
    }

    if (mrz_checkbox.checked) {
        let mrzResults = await recognizer.recognize(image);
        detection_result.innerHTML += "<strong>MRZ</strong> <br>" + JSON.stringify(mrzResults);
    }

    if (document_checkbox.checked) {
        let documentResults = await normalizer.detectQuad(image);
        detection_result.innerHTML += "<strong>Document</strong> <br>" + JSON.stringify(documentResults);
    }
    toggleLoading(false);
}

function scan() {

}