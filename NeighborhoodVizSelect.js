require([
    "esri/tasks/support/Query",
    "esri/tasks/QueryTask",
    "esri/layers/FeatureLayer"
], function (Query, QueryTask, FeatureLayer) {
    // Neighborhood name variable
    var neighborhoodIdStr;

    // Query the neighborhood layer to get the list of neighborhood names and Ids and add them to the dropdown list
    var queryTask = new QueryTask({
        url: "https://services9.arcgis.com/r2aSdvRtDKoaZzPC/arcgis/rest/services/Pittsburgh_Neighborhood_Database/FeatureServer/0"
    });
    var query = new Query();
    query.returnGeometry = false;
    query.outFields = ["hood"];
    query.where = "0=0";
    var select = document.getElementById("dropdownSelectNhood");
    queryTask.execute(query).then(function (results) {
        var numFeatures = results.features.length;
        var options = [];
        for (var i = 0; i < numFeatures; i++) {
            var feature = results.features[i];
            var el = document.createElement("option");
            el.textContent = feature.attributes.hood;
            el.value = feature.attributes.hood;
            options.push(el);
        }

        // Sort the neighborhoods
        options.sort(function (a, b) {
            if (a.text.toUpperCase() > b.text.toUpperCase()) return 1;
            else if (a.text.toUpperCase() < b.text.toUpperCase()) return -1;
            else return 0;
        });

        // Add to the select element
        for (var i = 0; i < numFeatures; i++) {
            select.appendChild(options[i]);
        }

        // Set the onchange event handler for the dropdown
        select.onchange = updateNeighborhood;

        // Update the neighborhood to the first one in the list
        updateNeighborhood();
    });

    // Set the onclick event handler for the button
    document.getElementById("openMap").onclick = function () {
        this.href = "tool.html?nhood=" + neighborhoodIdStr;
    }

    // Show the currently selected neighborhood
    function updateNeighborhood() {
        // Get the selected neighborhood Id
        neighborhoodIdStr = select.value;
    }
});


