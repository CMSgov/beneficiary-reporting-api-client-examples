# beneficiary-reporting-api-client

## Overview
The intention of this code is to demonstrate example Web Interface API clients and how one could use the APIs to programmtically complete their reporting requirements.

A set of example data has been provided for these examples. This data.json file represents completed submission data for each of the 14 Quality Scoring measures. Details on these measures can be found [here](https://www.cms.gov/Medicare/Quality-Payment-Program/Resource-Library/2018-Web-Interface-Measures-and-supporting-documents.zip)

The actual submission data that you will send should be mapped from you EHR system to the expected format.

// todo: show example of EHR data --> submission data (or just submission data?)
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

The measures metadata can be found [here](http://google.com). Reviewing the metadata should provide sufficient explanation of each measure and the expected answers for the measure questions.