import requests
import json
import asyncio
import os
import aiohttp

# BASEURL = 'https://qpp.cms.gov/api/submissions/web-interface/'
LOCAL_BASEURL = 'http://localhost:3000/api/submissions/web-interface/'
LIMIT = 100

class CollectStats:
    def get_url(self, path):
        return LOCAL_BASEURL+path

    async def fetch(self, url):
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers= { 'Content-Type': 'application/json' }) as response:
                return await response.json()

    async def patch(self, url, data):
        async with aiohttp.ClientSession() as session:
            async with session.patch(url, data = data, headers= { 'Content-Type': 'application/json' }) as response:
                return await response.json()

    async def post(self, url, data, headers):
        async with aiohttp.ClientSession() as session:
            async with session.post(url, data = data, headers = headers) as response:
                return await response.json()

    async def do_main_task(self):
        # get auth token
        token = await self.get_token()
        print(token)

        # Get a list of organizations
        org_data = await self.fetch(self.get_url('organizations'))
        
        #  We'll use the first org in the array on this example
        #  This should be matched with your EHR data by organization.tin and the performanceYear you are reporting on.
        #  For the purposes of this example we are only using the performanceYear
        my_orgs = org_data['data']['items']
        for item in my_orgs:
            if item['performanceYear'] == 2018:
                self.required_org = item
                break

        #  Get the first 100 beneficiaries with measures and submissions.  The api will return a maximum of 100 beneficiaries per call
        req_org_id = self.required_org['id']
        bene_data = await self.fetch(self.get_url('beneficiaries/organization/{org_id}?measures=true&submissions=true&limit={limit}').format(org_id=req_org_id, limit=LIMIT))
        benes = bene_data['data']['items']
        total_items = bene_data['data']['totalItems']
        loaded_count = len(benes)

        #  Loop through to get the remaining beneficiaries with measures and submissions
        offset = 0
        while total_items != loaded_count:
            offset = offset + bene_data['data']['startIndex'] + bene_data['data']['currentItemCount']
            submission_data = await self.fetch(self.get_url('beneficiaries/organization/{org_id}?measures=true&submissions=true&limit={limit}&offset={offset}').format(org_id=req_org_id, limit=LIMIT, offset=offset))
            benes = benes + submission_data['data']['items']
            loaded_count = len(benes)
        
        bene_info = map(self.update_bene_info, benes)
        val = list(bene_info)

        # Loop through all beneficiaries and update with EHR data
        # Call the beneficiaries PATCH endpoint to send the updates 100 beneficiaries at a time
        await self.call_beneficiaries(val, req_org_id)

        # Call the statistics endpoint to get your reporting statistics.
        stat_data = await self.fetch(self.get_url('organizations/{org_id}/stats').format(org_id=req_org_id))
        print(stat_data)

    async def call_beneficiaries(self, updates, req_org_id):
        index = 0
        while index < len(updates):
            url = self.get_url('beneficiaries/organization/{org_id}').format(org_id=req_org_id)
            batch = updates[index:index+100]
            strjson = json.dumps(batch)
            index += 100
            await self.patch(url, strjson)

    def update_bene_info(self, bene):
        beneObj = dict()
        beneObj['id'] = bene['id']
        beneObj['comments'] = 'A comment about this beneficiary'
        beneObj['medicalRecordFound'] = 'YES'
        val = map(self.update_measure_info, bene['measures'])
        beneObj['measures'] = list(val)
        return beneObj

    def update_measure_info(self, measure):
        measureObj = dict()

        my_path = os.path.abspath(os.path.dirname(__file__))
        path = os.path.join(my_path, "../data.json")
        with open(path, 'r') as j:
            self.json_data = json.load(j)
        submissions = self.json_data[measure['name']]['answers']
        answers = []

        if measure['name'] == 'CARE-1':
            for submission in measure['submissions']:
                if submission['scope'] == submission['value']:
                    answers.append(self.update_care1_submission_info(self.json_data['CARE-1']['answers'], submission))
                    break
        else:
            answers = submissions
        measureObj['name'] = measure['name']
        measureObj['comments'] = 'A comment about this measure'
        measureObj['submissions'] = answers

        return measureObj

    #  CARE-1 is a measure with 1 or more scopes.  All submissions must include the scope for each attribute except for the 'confirmed' attribute
    #  which is a shared attribute among all the scopes
    def update_care1_submission_info(self, answer_info, scope):
        submissionObj = dict()
        for record in answer_info:
            submissionObj = record
            if record['attribute'] == 'confirmed':
                submissionObj['scope'] = ''
            else:
                submissionObj['scope'] = scope['value']
        return submissionObj


    async def get_token(self):
        headers = {'Content-Type': 'application/json',
          'Accept': 'application/vnd.qpp.cms.gov.v1+json'}
        QPPURL = 'https://qpp.cms.gov/api/auth/'
        user_credentials =  {}
        user_credentials['username'] = input("Enter your username: ")
        user_credentials['password'] = input("Enter your password: ")

        # Verify credentials https://qpp.cms.gov/api/auth/docs/#/Authentication/post_api_auth_authn
        response_data = await self.post(QPPURL+'authn', user_credentials, headers)
        if (response_data['error']):
            return { 'error': response_data['error']['message'] }
        
        headers['Authorization'] = response_data['auth']['text']
        factor_id = response_data['data']['activeFactor']['id']
        if (len(response_data['data']['factors']) > 1):
            mfa_response = await self.post(QPPURL+'authn/request-mfa', { 'factorId': factor_id }, headers)
            response_data = mfa_response['data']

        mfa_code = input("Enter MFA Code: ")
        auth_response = await self.post(QPPURL+'authn/verify', { 'factorId': factor_id, 'verificationCode': mfa_code }, headers)
        response_data = auth_response['data']
        if (response_data['error']):
            return { 'error': response_data['error']['message'] }

        return response_data['auth']['text']

async def main():
    Web_Interface_Api = CollectStats()
    try:
        await Web_Interface_Api.do_main_task()
    except Exception as e:
        print('there is error running program', e)


if __name__ == "__main__":
    import time
    s = time.perf_counter()
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
    loop.close()
    elapsed = time.perf_counter() - s
    print(f"{__file__} executed in {elapsed:0.2f} seconds.")
