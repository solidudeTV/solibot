const speech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const _ = require('lodash');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const writeFile = util.promisify(fs.writeFile);

const client = new speech.TextToSpeechClient();

const voices = {
  chris: 'en-AU-Standard-D',
  jane: 'en-US-Standard-C',
  default: 'en-US-Standard-D',
};

const fileName = {
  audio: 'audio.mp3',
  data: 'audio.json',
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

  const [response] = await client.synthesizeSpeech(request);
  const audio = response.audioContent;

  await writeFile(fileName.audio, audio);
  console.log(`File written: ${fileName}`);

  await exec(`audiowaveform -i ${fileName.audio} -o ${fileName.data} -b 8 -z 64`);

  // Massage the file into simply an array of samples of audio magnitude and how many samples occur each second
  const audioData = require(`./${fileName.data}`);

  const maxMagnitude = 88;
  const samples = _(audioData.data)
    .chunk(2)
    .map(([low, high]) => {
      const avg = (Math.abs(low) + Math.abs(high)) / 2;
      return Math.min(avg, maxMagnitude) / maxMagnitude;
    })
    .value();

  const finalData = {
    text,
    samplesPerSecond: (audioData.sample_rate / audioData.samples_per_pixel),
    samples,
  };

  await writeFile(fileName.data, JSON.stringify(finalData));

  // Put them in the overlay directory and let nodemon save me
  const copyFileCommands = [
    `cp ${fileName.audio} ../overlay-web/src/`,
    `cp ${fileName.data} ../overlay-web/src/`,
  ];

  await exec(copyFileCommands.join(' && '));
  console.log('Done');
};
