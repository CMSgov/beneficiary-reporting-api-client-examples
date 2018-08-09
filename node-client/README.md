# Beneficiary Reporting API node client

```bash
cd node-client
```

### Install dependencies
```bash
npm i
```

### Authentication
Update the `TOKEN` setting it to use a valid JWT you obtain from following the authentication steps outlined [here]()
```javascript
const TOKEN = 'your-token-here';
```

### Updating data
In the example all measures for all benes will be completed using the examlpe data provided in the [data.json](https://github.cms.gov/qpp/beneficiary-reporting-api-client-examples/blob/master/data.json) file. This is for example purposes only and would obviously need to be replaced with actual data mapped from your EHR system.

### Run the app
Execue the start script by running
```bash
npm start
```