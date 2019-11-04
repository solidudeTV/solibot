const speech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const _ = require('lodash');
const util = require('util');

const exec = util.promisify(require('child_process').exec);
const writeFile = util.promisify(fs.writeFile);

const db = require('./db');
const client = new speech.TextToSpeechClient();

const outputDir = 'out';
try {
  fs.accessSync(outputDir, fs.constants.R_OK | fs.constants.W_OK);
} catch (e) {
  fs.mkdirSync(outputDir);
}

const filePath = {
  audio: `${outputDir}/audio.mp3`,
  awfData: `${outputDir}/awfData.json`,
  metadata: `${outputDir}/metadata.json`,
};


const voices = {
  chris: 'en-AU-Standard-D',
  jane: 'en-US-Standard-C',
  default: 'en-US-Standard-D',
};

async function listVoices() {
  const [result] = await client.listVoices({});
  const voices = result.voices;

  console.log('Voices:');
  voices.forEach(voice => {
    console.log(`Name: ${voice.name}`);
    console.log(`  SSML Voice Gender: ${voice.ssmlGender}`);
    console.log(`  Natural Sample Rate Hertz: ${voice.naturalSampleRateHertz}`);
    console.log(`  Supported languages:`);
    voice.languageCodes.forEach(languageCode => {
      console.log(`    ${languageCode}`);
    });
  });
}

module.exports.textToSpeech = async (text, voiceName) => {
  const request = {
    input: {
      text,
    },
    voice: {
      name: voices[voiceName] || voices.default,
      languageCode: 'en-US',
    },
    audioConfig: {
      audioEncoding: 'MP3',
    },
  };

  console.error(request);

  const [response] = await client.synthesizeSpeech(request);
  const audio = response.audioContent;

  await writeFile(filePath.audio, audio);

  await exec(`audiowaveform -i ${filePath.audio} -o ${filePath.awfData} -b 8 -z 64`);

  // Massage the file into simply an array of samples of audio magnitude and how many samples occur each second
  const awfData = require(`./${filePath.awfData}`);

  const maxMagnitude = 88;
  const samples = _(awfData.data)
    .chunk(2)
    .map(([low, high]) => {
      const avg = (Math.abs(low) + Math.abs(high)) / 2;
      const intensityRatio = Math.min(avg, maxMagnitude) / maxMagnitude;
      return Number(intensityRatio.toFixed(2));
    })
    .value();

  const metadata = {
    text,
    samplesPerSecond: (awfData.sample_rate / awfData.samples_per_pixel),
    samples,
  };

  await db.createOverlay({
    audio: audio.toString('base64'),
    metadata,
  });

  await writeFile(filePath.metadata, JSON.stringify(metadata));

  console.log('Done');
};
