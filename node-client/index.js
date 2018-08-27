const axios = require('axios');
const exampleData = require('../data.json');

const BASE_URL = 'http://localhost:3000/api/submissions/web-interface/';
const TOKEN = 'Bearer <token>'; // Replace <token> with your JWT for authentication
const LIMIT = 100; // This is the max query limit for the API

// Create the http client
const http = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authentication: TOKEN,
    'Content-Type': 'application/json'
  }
});

async function start() {
  /**
   * 1. Get a list of your organizations
   */
  const myOrganizations = (await http.get('organizations')).data;

  // We'll use the first org in the array on this example
  // This should be matched with your EHR data by organization.tin
  const organization = myOrganizations.data.items[0]

  /**
   * 2. Get the first 100 beneficiaries with measures and submissions.  The api will return a maximum of 100 beneficiaries per call
   */
  let result = (await http.get(`beneficiaries/organization/${organization.id}?measures=true&submissions=true&limit=${LIMIT}`)).data;
  let beneficiaries = result.data.items; // The first 100 beneficiaries
  const total = result.data.totalItems; // The total number of beneficiaries for the organization
  let loaded = beneficiaries.length;

  /**
   * 3. Loop through to get the remaining beneficiaries with measures and submissions
   */
  while (loaded !== total) {
    console.log(`${loaded} of ${total} loaded...`);
    // You will need to add an offset to the request in order to get the next set of beneficiaries
    const offset = result.data.startIndex + result.data.currentItemCount;
    result = (await http.get(`beneficiaries/organization/${organization.id}?measures=true&submissions=true&limit=${LIMIT}&offset=${offset}`)).data;
    beneficiaries = beneficiaries.concat(result.data.items);
    loaded = beneficiaries.length;
  }
  console.log(`${loaded} of ${total} loaded...`);

  /**
   * 4. Loop through all beneficiaries and update with EHR data
   */
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

        // CARE-1 is a measure with 1 or more scopes.  All submissions must include the scope for each attribute except for the 'confirmed' attribute
        // which is a shared attribute among all the scopes
        if (measure.name === 'CARE-1') {
          const scope = measure.submissions.find(submission => submission.scope === submission.value);
          submissions = exampleData['CARE-1'].answers.map((answer) => {
            return {
              ...answer,
              scope: answer.attribute === 'confirmed' ? '' : scope.value
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

  /**
   * 5. Call the beneficiaries PATCH endpoint to send the updates 100 beneficiaries at a time
   */
  while (updates.length > 0) {
    // Get the next 100 beneficiaries in the udpates to process unitl we have processed them all
    const batch = updates.splice(0, Math.min(100, updates.length));
    await http.patch(`beneficiaries/organization/${organization.id}/beneficiaries`, batch);
  }

  /**
   * 6. Check results for errors.
   * TODO: Output errors to some file or other format to be evaluated and corrected
   */
 
  /**
   * 7. Call the statistics endpoint to get your reporting statistics.
   * This will allow you to determine the status of reporting
   */
  const statsResult = (await http.get(`organizations/${organization.id}/stats`)).data;
  console.log('stats', statsResult.data);
}

// Start the process of updating beneficiaries
start()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
     console.log('error', error);
    process.exit(1);
  });