const axios = require('axios');

const exampleData = require('../data.json');

const BASE_URL = 'http://localhost:3000/api/submissions/web-interface/';
const TOKEN = 'your-token-here';
const LIMIT = 100; // this is the max query limit for the API

const http = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authentication: TOKEN
  }
});

async function start() {
  // 1. Get you organization id
  const myOrganizations = (await http.get('organizations')).data;
  
  // We'll use this first org in the array on this example
  // This should be matched with your EHR data by organization.tin
  const organization = myOrganizations.data.items[0];


  // 2. Get the first 100 beneficiaries with measures and submissions
  let result = (await http.get(`beneficiaries/organization/${organization.id}?measures=true&submissions=true&limit=${LIMIT}`)).data;
  let beneficiaries = result.data.items;
  const total = result.data.totalItems;
  let loaded = beneficiaries.length;


  // 3. Loop through to get the remaining beneficiaries with measures and submissions
  while (loaded !== total) {
    console.log(`${loaded} of ${total} loaded...`);
    const offset = result.data.startIndex + result.data.currentItemCount;
    result = (await http.get(`beneficiaries/organization/${organization.id}?measures=true&submissions=true&limit=${LIMIT}&offset=${offset}`)).data;
    beneficiaries = beneficiaries.concat(result.data.items);
    loaded = beneficiaries.length;
  }
  console.log(`${loaded} of ${total} loaded...`);

  // Collect all measure names that we have submitted data for.
  // This will be used later for status inspection
  const measureNames = [];

  // 4. Loop through all beneficiaries and update with EHR data
  const promises = beneficiaries.map((beneficiary) => {
    // Update the beneficiary info. For more info see *** todo: add link here to narrative describing bene medicalRecordFound
    beneficiary.medicalRecordFound = 'Y';

    // Update the measures with submission data *** todo: add link here to narrative describing measure submission data
    beneficiary.measures = beneficiary.measures.map((measure) => {
      if (!measureNames.includes(measure.name)) {
        measureNames.push(measure.name);
      }

      // Replace this fake submission data with your EHR data
      measure.submissions = exampleData[measure.name].answers;
      return measure;
    });

    // Call the beneficiaries PATCH endpoint to send the updates
    return http.patch(`organizations/${organization.id}/beneficiary/${beneficiary.id}`, beneficiary);
  });

  
  const results = await Promise.all(promises);


  // 5. Check results for errors.
  // TODO: Output errors to some file or other format to be evaluated and corrected
  

  // 6. Call the statistics endpoint to get your reporting statistics.
  //    This will allow you to determine the status of reporting
  const statsResult = (await http.get(`organizations/${organization.id}/statistics`)).data;
  console.log('stats', statsResult.data);
  
  return true;
}

start()
  .then(() => {
    console.log('Done!');s
    process.exit(0);
  })
  .catch((error) => {
    console.log('error', error);
    process.exit(1);
  });