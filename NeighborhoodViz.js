require([
    "esri/Map",
    "esri/views/MapView",
    "esri/tasks/support/Query",
    "esri/tasks/QueryTask",
    "esri/geometry/Extent",
    "esri/layers/FeatureLayer"
], function (Map, MapView, Query, QueryTask, Extent, FeatureLayer) {
    // Create the map
    var map = new Map({
        basemap: "gray"
    });

    // Create the view
    // Note we may want to have the extent set to the default selected neighborhood here
    var view = new MapView({
        container: "mapDiv",
        map: map,

        extent: {
            xmin: -8922360,
            ymin: 4907000,
            xmax: -8923683,
            ymax: 4965000,
            spatialReference: 102100
        }
    });

    // Disable snap to zoom so that we can set the extent precisely to the neighborhood
    view.constraints.snapToZoom = false;

    // Set the onchange event handler for the dropdown
    document.getElementById("dropdownSelect").onchange = showNeighborhood;

    // Query the neighborhood layer to get the list of neighborhood names and Ids and add them to the dropdown list
    var queryTask = new QueryTask({
        url: "https://services9.arcgis.com/r2aSdvRtDKoaZzPC/arcgis/rest/services/Pittsburgh_Neighborhood_Database/FeatureServer/0"
    });
    var query = new Query();
    query.returnGeometry = false;
    query.outFields = ["hood"];
    query.where = "0=0";
    var select = document.getElementById("dropdownSelect");
    queryTask.execute(query).then(function (results) {
        var numFeatures = results.features.length;
        var options = [];
        for (var i = 0; i < numFeatures; i++) {
            var feature = results.features[i];
            var el = document.createElement("option");
            el.textContent = feature.attributes.hood;
            el.value = feature.attributes.hood;
            options.push(el); //select.appendChild(el);
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
		
		// Get the neighborhood specified in the URL and select it in the dropdown

        var nhood = getParameterByName('nhood')

        if (nhood != null) {

            document.getElementById("dropdownSelect").value = nhood.replace(/"/g, '');
		}

        // Show the first neighborhood in the list
        showNeighborhood();
    });

    // Show the currently selected neighborhood
    function showNeighborhood() {
        // Remove existing feature layers
        if (map.allLayers.length > 2) {
            var countyLayer = map.allLayers.find(function (layer) {
                return layer.title === "County";
            });
            var parcelsLayer = map.allLayers.find(function (layer) {
                return layer.title === "Parcels";
            });
            var neighborhoodLayer = map.allLayers.find(function (layer) {
                return layer.title === "Neighborhood";
            });
            map.removeMany([countyLayer, parcelsLayer, neighborhoodLayer]);
        }

        // Get the selected neighborhood Id
        var neighborhoodIdStr = document.getElementById("dropdownSelect").value;

        // Create the parcels layer
        var featureLayer = new FeatureLayer({
            title: "Parcels",
            url: "https://services9.arcgis.com/r2aSdvRtDKoaZzPC/ArcGIS/rest/services/Pittsburgh_Land_Use_by_Parcel/FeatureServer",
            outFields: ["NHood"],
            definitionExpression: "NHood = '" + neighborhoodIdStr + "'"
        });
        map.add(featureLayer);

        // Create renderer until the symbology is defined in the map service
        var neighborhoodRenderer = {
            type: "simple",
            symbol: {
                type: "simple-fill",
                style: "none",
                outline: {
                    style: "solid",
                    width: "3px",
                    color: "brown"
                }
            }
        };

        // Create the neighborhood layer
        featureLayer = new FeatureLayer({
            title: "Neighborhood",
            url: "https://services9.arcgis.com/r2aSdvRtDKoaZzPC/arcgis/rest/services/PGH_Neighborhood_Database_Updated_LU_2/FeatureServer",
            outFields: ["SqMi", "SqMi_Pct", "POP_17", "POP_PCT_CI", "EMP_17", "EMP_PCT_CI", "HU_17", "HU_PCT_CIT", "HHI_17", "HHI_CITYAV", "NAUTO_MODE", "AUTO_CITYA", "RCOSTB_PT", "OCOSTB_CIT", "WID_Norm", "WID_city", "VACAC_N", "VACAC_PCT", "GHG", "GHG_City", "CONTEXT_1", "Commercial", "Industrial", "Institutional", "Mixed_Use", "Other", "Parks__Open_Space", "Residential", "Residential_Multifamily","Transportation__Utilities", "Vacant_1"],
            renderer: neighborhoodRenderer,
            definitionExpression: "hood = '" + neighborhoodIdStr + "'"
        });
        map.add(featureLayer);

        // Zoom to the extent of the selected neighborhood
        var query = new Query();
        query.where = "hood = '" + neighborhoodIdStr + "'";
        query.returnGeometry = true;
        featureLayer.queryFeatures(query).then(function (featureSet) {
            if (featureSet.features.length > 0) {
                var extent = featureSet.features[0].geometry.extent.expand(1.05);
                view.extent = new Extent({
                    xmin: extent.xmin,
                    ymin: extent.ymin,
                    xmax: extent.xmax,
                    ymax: extent.ymax,
                    spatialReference: {
                        wkid: 4326
                    }
                });
            }
        });

        // Populate the demographics text
        var isNewNeighborhood = true;
        view.whenLayerView(featureLayer).then(function (layerView) {
            layerView.watch("updating", function (val) {
                if (isNewNeighborhood) {
                    if (!val) {  // wait for the layer view to finish updating
                        layerView.queryFeatures().then(function (results) {
                            isNewNeighborhood = false;

                            // Update the metrics
                            document.getElementById("SqMi").innerText = numberWithCommas(results.features[0].attributes.SqMi);
                            document.getElementById("SqMi_Pct").innerText = "(" + (results.features[0].attributes.SqMi_Pct * 100).toFixed(2).toString() + "% of Pittsburgh)";
                            document.getElementById("POP_17").innerText = numberWithCommas(results.features[0].attributes.POP_17);
                            document.getElementById("POP_PCT_CI").innerText = "(" + results.features[0].attributes.POP_PCT_CI + "% of Pittsburgh)";
                            document.getElementById("EMP_17").innerText = numberWithCommas(results.features[0].attributes.EMP_17);
                            document.getElementById("EMP_PCT_CI").innerText = "(" + results.features[0].attributes.EMP_PCT_CI + "% of Pittsburgh)";
                            document.getElementById("HU_17").innerText = numberWithCommas(results.features[0].attributes.HU_17);
                            document.getElementById("HU_PCT_CIT").innerText = "(" + results.features[0].attributes.HU_PCT_CIT + "% of Pittsburgh)";
                            document.getElementById("HHI_17").innerText = "$" + numberWithCommas(results.features[0].attributes.HHI_17);
                            document.getElementById("HHI_CITYAV").innerText = "($" + numberWithCommas(results.features[0].attributes.HHI_CITYAV).toString() + " Pittsburgh Median)";
                            document.getElementById("NAUTO_MODE").innerText = numberWithCommas(results.features[0].attributes.NAUTO_MODE) + "%";
                            document.getElementById("AUTO_CITYA").innerText = "(" + numberWithCommas(results.features[0].attributes.AUTO_CITYA).toString() + "% Citywide)";
                            document.getElementById("RCOSTB_PT").innerText = numberWithCommas(results.features[0].attributes.RCOSTB_PT) + "%";
                            document.getElementById("OCOSTB_CIT").innerText = "(" + numberWithCommas(results.features[0].attributes.OCOSTB_CIT).toString() + "% Citywide)";
                            document.getElementById("WID_Norm").innerText = numberWithCommas(results.features[0].attributes.WID_Norm);
                            document.getElementById("WID_city").innerText = "(" + numberWithCommas(results.features[0].attributes.WID_city).toString() + " Pittsburgh Average)";
                            document.getElementById("VACAC_N").innerText = numberWithCommas(results.features[0].attributes.VACAC_N.toFixed(2)).toString();
                            document.getElementById("VACAC_PCT").innerText = "(2,323 acres city-wide)";
                            document.getElementById("GHG").innerText = numberWithCommas(results.features[0].attributes.GHG);
                            document.getElementById("GHG_City").innerText = "(" + numberWithCommas(results.features[0].attributes.GHG_City).toString() + " Pittsburgh Average)";

                            // Update the neighborhood description
                            var context = results.features[0].attributes.CONTEXT;
                            if (context == "" || context == null) { context = "No information available about this neighborhood." }
                            document.getElementById("context").innerText = context;

                            // Create the chart
                            chartData = [];
                            chartData.push(parseFloat(results.features[0].attributes.Commercial));
                            chartData.push(parseFloat(results.features[0].attributes.Industrial));
                            chartData.push(parseFloat(results.features[0].attributes.Institutional));
                            chartData.push(parseFloat(results.features[0].attributes.Mixed_Use));
                            chartData.push(parseFloat(results.features[0].attributes.Other));
                            chartData.push(parseFloat(results.features[0].attributes.Parks__Open_Space));
                            chartData.push(parseFloat(results.features[0].attributes.Residential));
                            chartData.push(parseFloat(results.features[0].attributes.Residential_Multifamily));
							chartData.push(parseFloat(results.features[0].attributes.Transportation__Utilities));
							chartData.push(parseFloat(results.features[0].attributes.Vacant_1));
                            drawChart();
                        });
                    }
                }
            });
        });
    }
});

// Declare variable for chart data
var chartData = [];

// Declare legend visible
var legendVisible = false;

// Set the window resize event
window.onresize = resizeAll;

// Load the chart package
google.charts.load('current', { 'packages': ['corechart'] });

// Resize elements when the window resizes
function resizeAll() {
    drawChart();
    document.getElementById("mapTitle").style.fontSize = document.getElementById("dropdownSelect").style.fontSize;
}

// Create the chart
function drawChart() {
    var data = google.visualization.arrayToDataTable([
        ['Type', 'Total'],
        ['Commercial', chartData[0]],
        ['Industrial', chartData[1]],
        ['Institutional', chartData[2]],
        ['Mixed Use', chartData[3]],
        ['Other', chartData[4]],
        ['Parks/ Open Space', chartData[5]],
        ['Residential-1,2 and 3 Family', chartData[6]],
		['Residential-Multifamily', chartData[7]],
		['Transportation / Utilities', chartData[8]],
        ['Vacant', chartData[9]]
    ]);

    var NumberFormat = new google.visualization.NumberFormat(
        { pattern: '##.#' }
    );
    NumberFormat.format(data, 1); // Apply formatter to second column

    var options = {
		legend: {position: 'none'},
		pieSliceTextStyle: {
            color: 'black',
			fontName: "Arial",
			fontSize: 15,
          },
		backgroundColor: { fill: "#f2f2f2" },
        titleTextStyle: {
            color: "black",
            fontName: "Arial",
            fontSize: 20,
            bold: true,
            italic: false
        },
        colors: ['rgb(255,0,0)', 'rgb(132,0,168)', 'rgb(0,92,230)', 'rgb(255,115,223)', 'rgb(205,205,102)', 'rgb(56,168,0)', 'rgb(255,240,0)', 'rgb(255,170,0)', 'rgb(156,156,156)', 'rgb(255,235,190)'],
        chartArea: {
            left: "10%",
            top: "10%",
            height: "80%",
            width: "80%"
        }
    };

    var chart = new google.visualization.PieChart(document.getElementById('chartDiv'));
    chart.draw(data, options);
}

// Toggle the legend
function toggleLegend() {
    legendVisible = !legendVisible;
    if (legendVisible) {
        document.getElementById("legend").style.display = "block";
    }
    else {
        document.getElementById("legend").style.display = "none";
    }
}

// Get query parameters

function getParameterByName(name, url) {

    if (!url) url = window.location.href;

    name = name.replace(/[\[\]]/g, '\\$&');

    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),

        results = regex.exec(url);

    if (!results) return null;

    if (!results[2]) return '';

    return decodeURIComponent(results[2].replace(/\+/g, ' '));

}

// Format numbers with commas
function numberWithCommas(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

