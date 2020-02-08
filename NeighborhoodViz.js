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
        url: "https://services9.arcgis.com/r2aSdvRtDKoaZzPC/ArcGIS/rest/services/Neighborhoods_PGH_dummy_data/FeatureServer/0"
    });
    var query = new Query();
    query.returnGeometry = false;
    query.outFields = ["hood_no", "hood"];
    query.where = "0=0";
    var select = document.getElementById("dropdownSelect");
    queryTask.execute(query).then(function (results) {
        var numFeatures = results.features.length;
        for (var i = 0; i < numFeatures; i++) {
            var feature = results.features[i];
            var el = document.createElement("option");
            el.textContent = feature.attributes.hood;
            el.value = feature.attributes.hood_no;
            select.appendChild(el);
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
            url: "https://services9.arcgis.com/r2aSdvRtDKoaZzPC/ArcGIS/rest/services/Parcels_PGH/FeatureServer/0",
            outFields: ["hood_no"],
            definitionExpression: "hood_no = " + neighborhoodIdStr
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
                    color: "brown"
                }
            }
        };

        // Create the neighborhood layer
        featureLayer = new FeatureLayer({
            title: "Neighborhood",
            url: "https://services9.arcgis.com/r2aSdvRtDKoaZzPC/ArcGIS/rest/services/Neighborhoods_PGH_dummy_data/FeatureServer/0",
            outFields: ["sqmiles","POP_17", "POP_PCT_CITY", "LU_RETAIL", "LU_OFFICE", "LU_IND", "LU_PUB", "LU_RES", "LU_OS"],
            renderer: neighborhoodRenderer,
            definitionExpression: "hood_no = " + neighborhoodIdStr
        });
        map.add(featureLayer);

        // Zoom to the extent of the selected neighborhood
        var query = new Query();
        query.where = "hood_no = " + neighborhoodIdStr;
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
                            document.getElementById("sqmiles").innerText = results.features[0].attributes.sqmiles + " Square Miles";
                            document.getElementById("sqmiles_PCT_CITY").innerText = (parseFloat(results.features[0].attributes.sqmiles) / 58.34 * 100).toFixed(2).toString() + "% of Pittsburgh";
                            document.getElementById("POP_17").innerText = results.features[0].attributes.POP_17;
                            document.getElementById("POP_PCT_CITY").innerText = "(" + results.features[0].attributes.POP_PCT_CITY + " of Pittsburgh)";
                            // Create the chart
                            chartData = [];
                            chartData.push(parseInt(results.features[0].attributes.LU_RETAIL));
                            chartData.push(parseInt(results.features[0].attributes.LU_OFFICE));
                            chartData.push(parseInt(results.features[0].attributes.LU_IND));
                            chartData.push(parseInt(results.features[0].attributes.LU_PUB));
                            chartData.push(parseInt(results.features[0].attributes.LU_RES));
                            chartData.push(parseInt(results.features[0].attributes.LU_OS));
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
        ['Retail', chartData[0]],
        ['Office', chartData[1]],
        ['Industrial', chartData[2]],
        ['Public', chartData[3]],
        ['Residential', chartData[4]],
        ['Open Space', chartData[5]]
    ]);

    var options = {
        title: 'Land Area Mix',
        titleTextStyle: {
            color: "black",
            fontName: "Arial",
            fontSize: 20,
            bold: true,
            italic: false
        },
        //colors: ['#e0440e', '#e6693e', '#ec8f6e', '#f3b49f', '#f6c7b6'],
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