const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");
const youtubedl = require("youtube-dl");

const defaultRoute = "/home/aelix/Música";
const downloadInfoFileDefaultRoute = `${defaultRoute}/songsToDownload.txt`;

function downloadVideos(videosInfo){

    for(let videoInfo of videosInfo){

        console.log(`Attepmting to download: ${videoInfo.title}\n`);
        youtubedl.exec(videoInfo.url, 
            ['-x', '--audio-format', 'mp3', "-o", `${defaultRoute}/${videoInfo.title}.mp3`], {}, (err, output)=> {
            if (err) throw err
            console.log(output.join('\n'));
        });

    }

    resetDownloadsFile();

}

function loadVideoInfo(){

    return new Promise((res, rej) =>{

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

async function getVideosData(urlsArr){

    const videosInfo = [];

    for(let i = 0; i < urlsArr.length; i++){

        const actualUrl = urlsArr[i];
        const response = await axios.get(actualUrl);
        const loadedHTML = cheerio.load(response.data);

        const videoTitle = loadedHTML("span#eow-title").text().trim();
        const channelName = loadedHTML("div.yt-user-info > a").text();
        const videoInfo = {title: videoTitle, channel: channelName, url: actualUrl};
        videosInfo.push(videoInfo);

    }

    return videosInfo;

}

function resetDownloadsFile(){

    try {
        fs.writeFileSync(downloadInfoFileDefaultRoute, '');
    } catch (err) {
        console.error(err)
    }

}

async function init(){

    console.log("Starting downloader..." + '\n');
    loadVideoInfo().then(async urls =>{

        const videosData = await getVideosData(urls);
        downloadVideos(videosData);

    })

};

init();