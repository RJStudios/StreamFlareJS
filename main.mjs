import fs from 'fs';
import path from 'path';
import readline from 'readline';
import youtubedl from 'yt-dlp-exec';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

function sanitizeFilename(filename) {
    return filename.replace(/[<>:"/\\|?*]+/g, '_').trim();
}

async function getVideoTitle(link) {
    try {
        const info = await youtubedl(link, {
            dumpSingleJson: true,
            quiet: true
        });
        return info.title;
    } catch (err) {
        throw new Error(`Failed to fetch video title: ${err.message}`);
    }
}

async function downloadYouTube(link, outputDir, fileFormat) {
    const videoTitle = await getVideoTitle(link);
    const sanitizedTitle = sanitizeFilename(videoTitle || 'downloaded_audio');
    const tempFile = path.join(outputDir, `temp_audio.${fileFormat}`);
    const finalFile = path.join(outputDir, `${sanitizedTitle}.${fileFormat}`);

    try {
        console.log(`Running command: yt-dlp -x --audio-format ${fileFormat} --output "${tempFile}" "${link}"`);
        await youtubedl(link, {
            extractAudio: true,
            audioFormat: fileFormat,
            output: tempFile,
            quiet: false
        });

        fs.renameSync(tempFile, finalFile);
        return finalFile;
    } catch (err) {
        throw new Error(`YouTube-dlp error: ${err.message}`);
    }
}

async function main() {
    const formats = ['mp3', 'flac', 'm4a', 'wav', 'aac', 'ogg', 'opus'];
    let fileFormat = (await question(`What format do you want? (${formats.join(', ')}): `)).toLowerCase();
    if (!formats.includes(fileFormat)) {
        console.log(`Choose one of the available formats: ${formats.join(', ')}!`);
        rl.close();
        return;
    }

    const links = (await question("Enter YouTube links (comma-separated for batch processing): ")).split(',').map(link => link.trim());
    const outputDir = (await question("Enter the output directory (leave blank for current directory): ")).trim() || process.cwd();
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const openAfterDownload = (await question("Open file after download? (yes/no): ")).trim().toLowerCase() === 'yes';

    for (const [index, link] of links.entries()) {
        try {
            console.log(`Processing link ${index + 1}: ${link}`);
            const outputFile = await downloadYouTube(link, outputDir, fileFormat);
            console.info(`Downloaded and saved as ${outputFile}`);
            if (openAfterDownload) require('child_process').exec(`start "" "${outputFile}"`);
        } catch (error) {
            console.error(`An error occurred while processing ${link}: ${error.message}`);
        }
    }

    rl.close();
}

main().catch(console.error);
