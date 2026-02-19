importScripts('../../ts/lib/three.js');
var tacoxdna; // Make typescript happy
importScripts('../../ts/lib/tacoxdna.js');



// TacoxDNA importer
function importFiles(files: File[]) {
    let from = (document.getElementById("importFromSelect") as HTMLSelectElement).value;
    let to = 'oxview';
    let opts = {};

    let progress = document.getElementById("importProgress");
    progress.hidden = false;

    let cancelButton = document.getElementById("importFileDialogCancel");

    document.body.style.cursor = "wait";

    if (from === "cadnano") {
        opts = {
            grid: (document.getElementById("importCadnanoLatticeSelect") as HTMLSelectElement).value,
            sequence: (document.getElementById("importCadnanoScaffoldSeq") as HTMLSelectElement).value,
            default_val: (document.getElementById("importCadnanoDefaultVal") as HTMLSelectElement).value
        };
    } else if (from === "rpoly") {
        opts = {
            sequence: (document.getElementById("importRpolyScaffoldSeq") as HTMLSelectElement).value
        };
    } else if (from === "tiamat") {
        opts = {
            tiamat_version: parseInt((document.getElementById("importTiamatVersion") as HTMLSelectElement).value),
            isDNA: (document.getElementById("importTiamatIsDNA") as HTMLSelectElement).value == "DNA",
            default_val: (document.getElementById("importTiamatDefaultVal") as HTMLSelectElement).value
        };
    }

    console.log(`Converting ${[...files].map(f => f.name).join(',')} from ${from} to ${to}.`);
    let readFiles = new Map();
    for (const file of files) {
        const reader = new FileReader();
        reader.onload = function (evt) {
            readFiles.set(file, evt.target.result);
            console.log(`Finished reading ${readFiles.size} of ${files.length} files`);
            if (readFiles.size === files.length) {
                var worker = new Worker('./dist/file_handling/tacoxdna_worker.js');
                let finished = () => {
                    progress.hidden = true;
                    Metro.dialog.close('#importFileDialog');
                    document.body.style.cursor = "auto";
                }
                worker.onmessage = (e: MessageEvent) => {
                    let converted = e.data;
                    parseOxViewString(converted); //I am not sure this is right
                    console.log('Conversion finished');
                    finished();
                };
                worker.onerror = (error) => {
                    console.log('Error in conversion');
                    notify(error.message, "alert");
                    finished();
                }
                cancelButton.onclick = () => {
                    worker.terminate();
                    console.log('Conversion aborted');
                    finished();
                }
                worker.postMessage([[...readFiles.values()], from, to, opts]);
            }
        };
        reader.readAsText(file);
    }
}

onmessage = function(e) {
    const [files, from, to, opts] = e.data;
    const result = tacoxdna.convertFromTo(files, from, to, opts);
    postMessage(result, undefined);
}