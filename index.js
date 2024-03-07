const fs = require("fs");
const path = require("path");
const youtubedl = require("youtube-dl-exec");
const logger = require('progress-estimator')()

//Pre - parsing neccessary env variables
//STRINGS
const YTDL_DEFAULT_INPUT_FILE = checkString("YTDL_DEFAULT_INPUT_FILE");
const YTDL_DEFAULT_OUTPUT_URL = checkString("YTDL_DEFAULT_OUTPUT_URL");
const YTDL_AUDIO_FORMAT = checkString("YTDL_AUDIO_FORMAT")

//BOOLEAN
const YTDL_SIMULATE = !checkBool("YTDL_SIMULATE");
const YTDL_DUMP_SINGLE_JSON = checkBool("YTDL_DUMP_SINGLE_JSON");
const YTDL_EXTRACT_AUDIO = checkBool("YTDL_EXTRACT_AUDIO");
const APP_SHOULD_CLEAN_INPUT_FILE = checkBool("APP_SHOULD_CLEAN_INPUT_FILE");
const APP_SHOULD_PRINT_ENV_VARS = checkBool("APP_SHOULD_PRINT_ENV_VARS");

//NUMERIC
const YTDL_AUDIO_QUALITY = checkNum("YTDL_AUDIO_QUALITY");

const defaultDownloadsFolderName = "downloads";

const defaultRoute = YTDL_DEFAULT_OUTPUT_URL || path.join(__dirname, defaultDownloadsFolderName);
const downloadInfoFileDefaultRoute = YTDL_DEFAULT_INPUT_FILE || `${defaultRoute}/songsToDownload.txt`;

/**
 * For debugging purposes...
 **/
function printEnvVars() {
  console.log(
    {
      YTDL_DEFAULT_INPUT_FILE: YTDL_DEFAULT_INPUT_FILE,
      YTDL_DEFAULT_OUTPUT_URL: YTDL_DEFAULT_OUTPUT_URL,
      YTDL_AUDIO_FORMAT: YTDL_AUDIO_FORMAT,
      YTDL_SIMULATE: !YTDL_SIMULATE,
      YTDL_DUMP_SINGLE_JSON: YTDL_DUMP_SINGLE_JSON,
      YTDL_EXTRACT_AUDIO: YTDL_EXTRACT_AUDIO,
      YTDL_AUDIO_QUALITY: YTDL_AUDIO_QUALITY,
      APP_SHOULD_CLEAN_INPUT_FILE: APP_SHOULD_CLEAN_INPUT_FILE,
      APP_SHOULD_PRINT_ENV_VARS: APP_SHOULD_PRINT_ENV_VARS
    },
    "\n"
  );
}

function checkString(varName) {
  const envVariable = process.env[varName];

  return envVariable.trim() !== "" ? envVariable : false;
}

function checkBool(varName) {
  const envVariable = process.env[varName];

  return envVariable === "true" ? true : false;
}

function checkNum(varName) {
  const envVariable = process.env[varName];

  return envVariable | 0;
}

function downloadVideos(videosInfo) {
  const allPromiseVideos = [];

  for (let url of videosInfo) {
    const promise = youtubedl(
      url,
      {
        noSimulate: YTDL_SIMULATE || null,
        dumpSingleJson: YTDL_DUMP_SINGLE_JSON || true,
        extractAudio: YTDL_EXTRACT_AUDIO || true,
        audioFormat: YTDL_AUDIO_FORMAT || "best",
        audioQuality: YTDL_AUDIO_QUALITY || 0,
        //output: `${defaultRoute}/%(title)s.%(ext)s`
        output: `${defaultRoute}/%(title)s.${YTDL_AUDIO_FORMAT}`
      }
    )

    allPromiseVideos.push(logger(promise, `Obtaining data...`).then(result => {
      let { title, channel, audio_ext, video_ext, duration_string, channel_id } = result;

      if (YTDL_AUDIO_FORMAT !== "") {
        audio_ext = YTDL_AUDIO_FORMAT;
      }

      console.log(
        `\x1b[32m\nDownloaded:\x1b[37m ${title}.${audio_ext || video_ext} \n\x1b[34mChannel:\x1b[37m ${channel}\n`,
      );

      return { title, channel, audio_ext, duration: duration_string, channel_id };
    }).catch(e => {
      console.error(e.message || e);
    }));
  }

  return allPromiseVideos;

}

function loadVideoInfo() {

  return new Promise((res, rej) => {

    try {

      const data = fs.readFileSync(downloadInfoFileDefaultRoute, 'utf8');
      const treatedData = data.split('\n');

      treatedData.pop();

      res(treatedData);

    } catch (err) {
      rej(err);
    }

  });

}

function resetDownloadsFile() {
  try {
    fs.writeFileSync(downloadInfoFileDefaultRoute, ''); return true;
  } catch (err) {
    return false;
  }
}

function printSummary(data) {
  console.log("\n-------------------------- \x1b[93mSUMMARY\x1b[37m --------------------------\n");

  const ndata = data.map(d => {
    for (let prop in d) {
      if (d[prop] === 'none') {
        delete d[prop];
      }
    }

    return d;
  });

  console.table(ndata);
  console.log("");
}

function createInputFileIfNotExists(fpath) {
  //The main folder for downloads doesn't exists
  if (!checkInputFile(fpath)) {
    console.log(`\x1b[33mWarning!\x1b[37m, input file not found or not created!\n`);
    console.log(`trying to create: \x1b[32m${fpath}\x1b[37m\n`);

    //If it's not a simulation
    if (YTDL_SIMULATE) {
      try {
        fs.mkdirSync(path.join(__dirname, defaultDownloadsFolderName));

        const created = resetDownloadsFile();

        if (created) {
          console.log(`\x1b[32m[!]\x1b[37m OK Input file created sucessfully!\n`);
        }
        else {
          console.log(`\x1b[31m[!]\x1b[37m ERR!! failed to create the input file!\n`);
        }
      } catch (e) {
        console.error(e.message || e);
      }

    }
  }
}

function printSignals() {
  /* 
    It's simulating the query (yes it's inversed because the ytdl command is noSimulate)
    which is exactly the opposite
  */
  if (!YTDL_SIMULATE) {
    console.log("\n--------------- \x1b[32mSIMULATION MODE ACTIVATED\x1b[37m ---------------\n");
  }

  if (APP_SHOULD_PRINT_ENV_VARS) {
    printEnvVars();
  }

  console.log("Starting downloader..." + '\n');
}

function checkInputFile(path) {
  return fs.existsSync(path);
}

async function init() {
  printSignals();
  createInputFileIfNotExists(downloadInfoFileDefaultRoute);

  loadVideoInfo().then(async (urls) => {

    if (urls.length > 0) {
      try {
        const videosDownloaded = await Promise.all(downloadVideos(urls));

        printSummary(videosDownloaded);

        console.log(`All videos has been downloaded sucessfully to: \x1b[32m${defaultRoute}\x1b[37m`);
      } catch (e) {
        console.error(e.message || e);
      }
      finally {
        if (APP_SHOULD_CLEAN_INPUT_FILE) {
          //ONLY TOUCH THE INPUT FILE IF WE AREN'T IN SIMULATION MODE
          if (YTDL_SIMULATE) {
            console.log(`\nInput file: \x1b[33m${downloadInfoFileDefaultRoute}\x1b[37m has been cleaned!`);

            resetDownloadsFile();
          }
        }
      }
    }
    else {
      console.log("\x1b[33mWarning! \x1b[37mNo files has been specified for download!");
    }

  })
    .catch(e => {
      //In simulation mode we skip creating the file required so we print a msg simulating that the file already exists but
      //We don't have nothing in the file to download
      if (!YTDL_SIMULATE) {
        console.log("\x1b[33mWarning! \x1b[37mNo files has been specified for download!");
      }
      else {
        console.error(e.message || e);
      }
    })
};

init();
