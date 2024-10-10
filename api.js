const API_URL = "https://api.fda.gov/";
let fieldChoice = "";
let dataChoice = "";
let fieldDataChoice = ""
let QUERY_URL = "";
let dataOptions = {
    "Drug": {
        "Adverse Effects": {
            value: "event",
            url: "./fieldData/drugEvent.yaml"
        },
        "Product Labeling": {
            value: "label",
            url: "./fieldData/drugLabel.yaml"
        },
        "NDC Directory": {
            value: "ndc",
            url: "./fieldData/drugNDC.yaml"
        },
        "Recall Reports": {
            value: "enforcement",
            url: "./fieldData/drugEnforcement.yaml"
        },
        "FDA Drugs": {
            value: "drugsfda",
            url: "./fieldData/drugFDA.yaml"
        }
    },
    "Device": {
        "510k": {
            value: "510k",
            url: "./fieldData/device510k.yaml"
        },
        "Classification": {
            value: "classification",
            url: "./fieldData/deviceClassification.yaml"
        },
        "Recall Reports": {
            value: "enforcement",
            url: "./fieldData/deviceReport.yaml"
        },
        "Adverse Effects": {
            value: "event",
            url: "./fieldData/deviceEffects.yaml"
        },
        "Pre-market": {
            value: "pma",
            url: "./fieldData/devicePremarket.yaml"
        },
        "Recalls": {
            value: "recall",
            url: "./fieldData/deviceRecalls.yaml"
        },
        "Registrations/Listings": {
            value: "registrationlisting",
            url: "./fieldData/deviceRegistration.yaml"
        },
        "COVID-19 Testing": {
            value: "covid19serology",
            url: "./fieldData/deviceCovid.yaml"
        },
        "Unique Device ID": {
            value: "udi",
            url: "./fieldData/deviceID.yaml"
        }
    },
    "Food": {
        "Recall Reports": {
            value: "enforcement",
            url: "./fieldData/foodReport.yaml"
        },
        "Adverse Effects": {
            value: "event",
            url: "./fieldData/foodEffects.yaml"
        }
    }
}

// Function to get JS Objects for each YAML file
function loadYaml(file) {
    try {
        // Load the yaml file to be usable as JS objects
        const currentFile = jsyaml.load(file);
        return currentFile;
    } catch (e) {
        console.log(e);
        return null;
    }
}

// Parse every parameter and recursively get nested paramters
function parseFile(props, parent = '') {
    let fields = [];

    for (let key in props) {
        let value = props[key];
        let fieldName = parent ? `${parent}.${key}` : key;

        // Check if the property is an object (top level)
        if (value.type === 'object' && value.properties) {
            // Recursively parse the properties of the object
            let nestedField = parseFile(value.properties, fieldName);
            fields = fields.concat(nestedField);
        } 
        // Check if the property is an array (deeper nesting)
        else if (value.type === 'array' && value.items) {
            // If items are an object, parse its properties (sub fields)
            if (value.items.properties) {
                let arrayField = parseFile(value.items.properties, `${fieldName}`);
                fields = fields.concat(arrayField);
            } 
        } 
        else {
            // Handle the base case for fields
            if (value.is_exact) {
                fields.push(`${fieldName}.exact`); // For exact fields
            } else {
                fields.push(fieldName); // For non-exact fields
            }
        }
    }
    return fields;
}

// Function to get all parameters available to the data choice (in YAML file)
async function getDataFields(file) {
    // Promise to fulfill all fieldData before sending it
    try {
        const response = await fetch(file);
        const content = await response.text();
        const fields = loadYaml(content);

        if (fields) {
            // Recursive parsing of each field
            const generatedField = parseFile(fields.properties);
            return generatedField;
        } else {
            throw new Error("No fields found in the YAML file.");
        }
    } catch (e) {
        console.log("Error: ", e);
        throw e;
    }
}


// Function to build the query based on user selections
function buildQuery() {
    let param = "count";
    // if ((fieldChoice == "Drug" && dataChoice == "event") || (fieldChoice == "Drug" && dataChoice == "label")) {
    //     param = "search";
    // }
    // else {
    //     param = "count";
    // }
    QUERY_URL = API_URL + fieldChoice + "/" + dataChoice + ".json?" + param + "=" + fieldDataChoice;
}

// Function to fetch data and create Plotly graph
async function fetchDataAndPlot() {
    try {
        const response = await fetch(QUERY_URL);
        const data = await response.json();
        const results = data.results;

        // Prepare data for Plotly
        const resultValues = results.map(item => item.term);
        const resultCounts = results.map(item => item.count);

        // Set plot type to bar
        const trace = {
            x: resultValues,
            y: resultCounts,
            type: 'bar',
        };

        const layout = {
            yaxis: { title: 'Count' }
        };

        Plotly.newPlot('graph', [trace], layout, { responsive: true}, { displayModeBar: false});
    } catch (error) {
        console.error('Error fetching or plotting data:', error);
    }
}

document.getElementById("submitQuery").addEventListener("click", function(event) {
    event.preventDefault();
    let field = document.getElementById("field").value;
    let data = document.getElementById("data").value;
    let fieldData = document.getElementById("fieldData").value;
    if (field && data && fieldData) {
        event.preventDefault();
        fieldChoice = field;
        dataChoice = data;
        fieldDataChoice = fieldData;
        buildQuery();
        console.log(QUERY_URL);
        fetchDataAndPlot();
    }
});

window.onload = function() {
    let field = document.getElementById("field");
    let data = document.getElementById("data");
    let fieldData = document.getElementById("fieldData");
    for (let value in dataOptions) {
        // Options have (display, value) pairs
        field.options[field.options.length] = new Option(value, value);
    }
    field.onchange = function() {
        data.length = 1; // Clear drop-down
        let options = dataOptions[this.value]; // Get data options based on selected field
        for (let display in options) {
            let value = options[display].value;
            data.options[data.options.length] = new Option(display, value);
        }
    };
    data.onchange = async function() {
        fieldData.length = 1; // Clear drop-down
        let options = dataOptions[field.value]; // Use field's value to get the correct data options
        let selectedOptionKey = data.options[this.selectedIndex].text; // Get Data choice
        let selectedOption = options[selectedOptionKey];

        const fields = await getDataFields(selectedOption.url); // Parse the file at the given YAML URL

        // Populate fieldData dropdown with fields
        if (fields) {
            fields.forEach(field => {
                fieldData.options[fieldData.options.length] = new Option(field, field);
            });
        }
    };
    
}
