
import requests
import json
import asyncio
import os
from datetime import datetime

BASEURL = 'https://qpp.cms.gov/api/submissions/web-interface/'
LIMIT = 100

class CollectStats:
    def do_main_task(self):
        headers = {'Content-Type': 'application/json'}

        # get auth token
        self.get_token()

        # Get a list of organizations
        org_api_response = requests.get('http://localhost:3000/api/submissions/web-interface/organizations', headers=headers)
        if org_api_response.status_code != 200:
            print('Error code', org_api_response.status_code)
        else:
            org_data = org_api_response.json()
            my_orgs = org_data['data']['items']
            for item in my_orgs:
                if item['performanceYear'] == 2018:
                    self.required_org = item
                    break

        #  Get the first 100 beneficiaries with measures and submissions.  The api will return a maximum of 100 beneficiaries per call
        req_org_id = self.required_org['id']
        bene_api_response = requests.get('http://localhost:3000/api/submissions/web-interface/beneficiaries/organization/{org_id}?measures=true&submissions=true&limit={limit}'.format(org_id=req_org_id, limit=LIMIT), headers=headers)
        bene_data = bene_api_response.json()
        benes = bene_data['data']['items']
        total_items = bene_data['data']['totalItems']
        loaded_count = len(benes)

        offset = 0
        while total_items != loaded_count:
            offset = offset + bene_data['data']['startIndex'] + bene_data['data']['currentItemCount']
            result = requests.get('http://localhost:3000/api/submissions/web-interface/beneficiaries/organization/{org_id}?measures=true&submissions=true&limit={limit}&offset={offset}'.format(org_id=req_org_id, limit=LIMIT, offset=offset), headers=headers)
            submission_data = result.json()
            benes = benes + submission_data['data']['items']
            loaded_count = len(benes)
        
        val = list(map(self.update_bene_info, benes))
        self.call_beneficiaries(val, req_org_id)

        statResult = requests.get('http://localhost:3000/api/submissions/web-interface/organizations/{org_id}/stats'.format(org_id=req_org_id), headers=headers)
        print(statResult.json())


    def call_beneficiaries(self, updates, req_org_id):
        headers = {'Content-Type': 'application/json'}
        print(len(updates))
        index = 0
        while index < len(updates):
            url = 'http://localhost:3000/api/submissions/web-interface/beneficiaries/organization/{org_id}'.format(org_id=req_org_id)
            batch = updates[index:index+100]
            strjson = json.dumps(batch)
            index += 100
            result = requests.patch(url, data=strjson, headers=headers)
            
            if result.status_code != 200:
                print(strjson)
                print("Error. Response code is ", result.status_code)
                print(result.json())
                print('Index:', index)
                if index in [100, 1100, 1300, 1900]:
                    continue
                else:
                    break
            else:
                print ("Successful")

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
    
    def update_care1_submission_info(self, answer_info, scope):
        submissionObj = dict()
        for record in answer_info:
            submissionObj = record
            if record['attribute'] == 'confirmed':
                submissionObj['scope'] = ''
            else:
                submissionObj['scope'] = scope['value']
        return submissionObj


    def get_token(self):
        # api_token = 'your_api_token'
        headers = {'Content-Type': 'application/json',
          'Accept': 'application/vnd.qpp.cms.gov.v1+json'}
        qpp_url = 'https://qpp.cms.gov/api/auth/'
        user_credntials =  {}
        user_credntials['username'] = input("Enter your username: ")
        user_credntials['password'] = input("Enter your password: ")

        # Verify credentials https://qpp.cms.gov/api/auth/docs/#/Authentication/post_api_auth_authn
        print(qpp_url+'authn')
        auth_response = requests.post(url= qpp_url+'authn', data=user_credntials, headers=headers)
        response = auth_response.json()
        response_data = response['data']
        if (response is None or response_data['auth'] is None):
            return { 'error': response_data['error']['message'] }
        
        headers['Authorization'] = response_data['auth']['text']
        factor_id = response_data['data']['activeFactor']['id']
        if (len(response_data['data']['factors']) > 1):
            mfa_response = requests.post(qpp_url+'authn/request-mfa', data={ 'factorId': factor_id }, headers=headers)
            response_data = mfa_response.json()['data']

        mfa_code = input("Enter MFA Code: ")
        auth_response = requests.post(qpp_url+'authn/verify', data={ 'factorId': factor_id, 'verificationCode': mfa_code }, headers=headers)
        response_data = mfa_response.json()['data']
        if (auth_response['auth'] is None):
            return { 'error': response_data['message'] }

        return response_data['auth']['text']


chetan = CollectStats()
try:
    chetan.do_main_task()
except Exception as e:
    print('there is error running program', e)
