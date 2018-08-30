# Beneficiary Reporting API node client

```bash
cd node-client
```

### Install dependencies
```bash
npm i
```

### Authentication
At runtime the user will be promted for Authentication credentials. Authorizations in the ppreview environment requires MFA. There are two calls to complete this process. These can be reviewed here](https://qpp.cms.gov/api/auth/docs/#/Authentication/post_api_auth_authn) and here](https://qpp.cms.gov/api/auth/docs/#/Authentication/post_api_auth_authn_verify)

### Updating data
In the example all measures for all benes will be completed using the example data provided in the [data.json](https://github.cms.gov/qpp/beneficiary-reporting-api-client-examples/blob/master/data.json) file. This is for example purposes only and would obviously need to be replaced with actual data mapped from your EHR system.

### Run the app
Execute the start script by running
```bash
npm start
```