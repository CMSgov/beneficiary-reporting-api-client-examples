const axios = require('axios');

const exampleData = require('../data.json');

const BASE_URL = 'http://localhost:3000/api/submissions/web-interface/';
const TOKEN = 'your-token-here';
const LIMIT = 100; // this is the max query limit for the API

const http = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authentication: TOKEN,
    'Content-Type': 'application/json'
  }
});

async function start() {
  // 1. Get your organization id
  const myOrganizations = (await http.get('organizations')).data;

  // We'll use this first org in the array on this example
  // This should be matched with your EHR data by organization.tin
  const organization = myOrganizations.data.items.find(org => org.id === 103789)


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

  // 4. Loop through all beneficiaries and update with EHR data
  const updates = beneficiaries.map((beneficiary) => {
    // Update the beneficiary info. For more info see *** todo: add link here to narrative describing bene medicalRecordFound
    return {
      id: beneficiary.id, // required
      comments: 'A comment about this beneficiary',
      skippedReason: null,
      medicalRecordFound: 'YES',
      measures: beneficiary.measures.map((measure) => {
        // Update one or more measures with submission data *** todo: add link here to narrative describing measure submission data
        let submissions = exampleData[measure.name].answers;

        // CARE-1 is a measure with 1 or more scopes.  All submissions must include the scope for each attribute
        if (measure.name === 'CARE-1') {
          const scope = measure.submissions.find(submission => submission.scope === submission.value);
          submissions = exampleData['CARE-1'].answers.map((answer) => {
            return {
              ...answer,
              scope: scope.value
            }
          });
        }

        return {
          name: measure.name, // required
          comments: 'A comment about this measure',
          submissions
        };
      })
    };
  });

  // 5. Call the beneficiaries PATCH endpoint to send the updates 100 beneficiaries at a time
  while (updates.length > 0) {
    const batch = updates.splice(0, Math.min(100, updates.length));
    await http.patch(`beneficiaries/organization/${organization.id}/beneficiaries`, batch);
  }


  // 6. Check results for errors.
  // TODO: Output errors to some file or other format to be evaluated and corrected


  // 7. Call the statistics endpoint to get your reporting statistics.
  //    This will allow you to determine the status of reporting
  const statsResult = (await http.get(`organizations/${organization.id}/stats`)).data;
  console.log('stats', statsResult.data);

  return true;
}

start()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
     console.log('error', error);
    process.exit(1);
  });