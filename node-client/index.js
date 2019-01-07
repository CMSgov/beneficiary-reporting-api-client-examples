const axios = require('axios');
const inquirer = require('inquirer');
const exampleData = require('../data.json');

const BASE_URL = 'https://qpp.cms.gov/api/submissions/web-interface/';
const LIMIT = 100; // This is the max query limit for the API


async function start() {
  /**
   * 1. get auth token
   */
  const token = await getToken();
  if (token.error) {
    throw new Error(`Error validating credentials. ${token.error.message}`);
  }
  
  // Create the http client
  const http = axios.create({
    baseURL: BASE_URL,
    headers: {
      Authentication: token,
      'Content-Type': 'application/json'
    }
  });
  

  /**
   * 2. Get a list of your organizations
   */
  const myOrganizations = (await http.get('organizations')).data;

  // We'll use the first org in the array on this example
  // This should be matched with your EHR data by organization.tin
  const organization = myOrganizations.data.items[0];


  /**
   * 3. Get the first 100 beneficiaries with measures and submissions.  The api will return a maximum of 100 beneficiaries per call
   */
  let result = (await http.get(`beneficiaries/organization/${organization.id}?measures=true&submissions=true&limit=${LIMIT}`)).data;
  let beneficiaries = result.data.items; // The first 100 beneficiaries
  const total = result.data.totalItems; // The total number of beneficiaries for the organization
  let loaded = beneficiaries.length;


  /**
   * 4. Loop through to get the remaining beneficiaries with measures and submissions
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
   * 5. Loop through all beneficiaries and update with EHR data
   */
  const updates = beneficiaries.map((beneficiary) => {
    // Update the beneficiary info. For more info see *** todo: add link here to narrative describing bene medicalRecordFound
    return {
      id: beneficiary.id, // required
      comments: 'A comment about this beneficiary',
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
   * 6. Call the beneficiaries PATCH endpoint to send the updates 100 beneficiaries at a time
   */
  while (updates.length > 0) {
    // Get the next 100 beneficiaries in the udpates to process unitl we have processed them all
    const batch = updates.splice(0, Math.min(100, updates.length));
    await http.patch(`beneficiaries/organization/${organization.id}`, batch);
    console.log(`${total - updates.length} of ${total} updated...`);
  }


  /**
   * 7. Check results for errors.
   * TODO: Output errors to some file or other format to be evaluated and corrected
   */
 
  
  /**
   * 8. Call the statistics endpoint to get your reporting statistics.
   * This will allow you to determine the status of reporting
   */
  const statsResult = (await http.get(`organizations/${organization.id}/stats`)).data;
  console.log('stats', statsResult.data);
}

async function getToken() {
  const authHttpClient = axios.create({
    baseURL: 'https://qpp.cms.gov/api/auth/',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.qpp.cms.gov.v1+json'
    }
  })
  const prompt = inquirer.createPromptModule();
  const usernamePrompt = [
    {
      type: 'input',
      name: 'username',
      message: 'username:'
    }
  ];
  let response = await prompt(usernamePrompt);
  const username = response.username;

  const passwordPrompt = [
    {
      type: 'password',
      name: 'password',
      message: 'password:'
    }
  ];
  response = await prompt(passwordPrompt);
  const password = response.password;

  // Verify credentials https://qpp.cms.gov/api/auth/docs/#/Authentication/post_api_auth_authn
  response = (await authHttpClient.post(`authn`, {
    username,
    password
  })).data;
  if (!response.auth) {
    return { error: response.message };
  }

  let config = {
    headers: {
      Authorization: response.auth.text,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.qpp.cms.gov.v1+json'
    }
  };

  const factorId = response.data.activeFactor.id;

  if (response.data.factors.length > 1) {
    // Request MFA code https://qpp.cms.gov/api/auth/docs/#/Authentication/post_api_auth_authn_request_mfa
    response = (await authHttpClient.post(`authn/request-mfa`, {
      factorId
    }, config)).data;
  }

  const mfaCodePrompt = [
    {
      type: 'input',
      name: 'mfaCode',
      message: 'MFA Code:'
    }
  ];
  response = await prompt(mfaCodePrompt);
  const mfaCode = response.mfaCode;

  // Verify MFA code https://qpp.cms.gov/api/auth/docs/#/Authentication/post_api_auth_authn_verify
  response = (await authHttpClient.post(`authn/verify`, {
    factorId,
    verificationCode: mfaCode
  }, config)).data;

  if (!response.auth) {
    return { error: response.message };
  }

  // Return token
  return response.auth.text;
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