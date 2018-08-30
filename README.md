# Beneficiary Reporting API Client Examples

# Overview #
The intention of this code is to demonstrate example Web Interface API clients and how one could use the APIs to programmtically complete their reporting requirements. Each project is self contained in its own project directory (Ex. node-client), and each project has its own README.

### Example Data
A set of example data has been provided for these examples. This data.json file represents completed submission data for each of the 14 Quality Scoring measures. Details on these measures can be found [here](https://www.cms.gov/Medicare/Quality-Payment-Program/Resource-Library/2018-Web-Interface-Measures-and-supporting-documents.zip)

The actual submission data that you will send should be mapped from you EHR system to the expected format.

For example, submissions for a beneficiary in PREV-5 would look like this:
```json
[
  {
    "attribute": "confirmation",
    "value":"Y"
  },
  {
    "attribute": "screening-performed",
    "value":"Y"
  }
]
```

The measures metadata can be found [here - wip](http://google.com). Reviewing the metadata should provide sufficient explanation of each measure and the expected answers for the measure questions.

# Installing and Getting Started #

### Downloading the examples ###

If you have Git installed, go on and clone the repository.
From your favorite command line:

```bash
$ git clone https://github.cms.gov/qpp/beneficiary-reporting-api-client-examples.git
```

To run the individual example projects see the README in their respective project directories. In each example you will need to change the TOKEN value to a JWT you obtain by following the user authentication steps outlined [here](https://qpp.cms.gov/api/auth/docs/#/Authentication)
