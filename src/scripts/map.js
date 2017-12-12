const serverLocation = "http://localhost:3000";
const mapFilename = "map_tiles";
const tilesDir = path.join(data_path, mapFilename);
let tile_urls;
mapboxgl.accessToken = "NOT-REQUIRED-WITH-YOUR-VECTOR-TILES-DATA";

function rotate_plane() {};

class MapLoader extends EventEmitter {};
const map_loader = new MapLoader();

class MapEvent extends EventEmitter {};
const map_event = new MapEvent();

function draw_map() {
    console.log("draw map | tile urls", tile_urls);

    $("#map").html("");

    let map_style = {
        version: 8,
        sources: {
            "openmaptiles-japan": {
                type: "vector",
                tiles: tile_urls,
                minzoom: 0,
                maxzoom: 14
            },
            "okegawa_point": {
                type: "geojson",
                data: {
                    type: "Point",
                    coordinates: [139.523889, 35.975278]
                }
            }
        },
        layers: [{
                id: "water",
                source: "openmaptiles-japan",
                'source-layer': "water",
                interactive: true,
                type: "line",
                paint: {
                    'line-color': '#0761FC'
                }
            },
            {
                id: "aeroway",
                source: "openmaptiles-japan",
                'source-layer': "aeroway",
                interactive: true,
                type: "line",
                paint: {
                    'line-color': '#FC7907',
                    'line-width': 5
                }
            },
            {
                id: "boundary",
                source: "openmaptiles-japan",
                'source-layer': "boundary",
                interactive: true,
                type: "line",
                paint: {
                    'line-color': '#66FF99',
                    'line-width': 1
                }
            },
            {
                id: "transportation",
                source: "openmaptiles-japan",
                'source-layer': "transportation",
                interactive: true,
                type: "line",
                paint: {
                    'line-color': '#660099',
                    'line-width': 1
                }
            },
            {
                id: "okegawa_point",
                type: "circle",
                source: "okegawa_point",
                paint: {
                    "circle-radius": 10,
                    "circle-color": "#007CBF"
                },
                minzoom: 3
            }
        ]
    }

    let map_options = {
        container: 'map',
        center: [139.523889, 35.975278],
        zoom: 13,
        minZoom: 1,
        maxZoom: 18,
        attributionControl: false,
        style: map_style
    }


    let map = new mapboxgl.Map(map_options);

    map.on('load', function() {

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        let propertyList = document.getElementById('propertyList');
        map.on('mousemove', function(e) {
            set_plane(e.lngLat.lng, e.lngLat.lat);
            propertyList.innerHTML = '';
            let features = map.queryRenderedFeatures(e.point, {
                radius: 100000
            });
            if (features[0]) {
                propertyList.innerHTML = JSON.stringify(e.lngLat, null, 2) + '<br/>' + JSON.stringify(features[0].properties, null, 2);
            } else {
                propertyList.innerHTML = JSON.stringify(e.lngLat, null, 2);
            }
        });

        let point = {
            type: "Point",
            coordinates: [139.523889, 35.975278]
        };
        map.addSource('plane_gps', {
            type: "geojson",
            data: point
        });
        map.addImage('plane', {
            width: plane_width,
            height: plane_width,
            data: plane_image
        });
        map.addLayer({
            id: "plane",
            type: "symbol",
            source: "plane_gps",
            layout: {
                "icon-image": "plane",
                "icon-size": 1.0,
                "icon-offset": [0, 39],
                "icon-rotation-alignment": "map"
            }
        });

        let plane_source = map.getSource('plane_gps');

        function set_plane(location_lng, location_lat) {
            point.coordinates[0] = location_lng;
            point.coordinates[1] = location_lat;
            plane_source.setData(point);
        }

        function rotate_plane(options) {
            map.setLayoutProperty('plane', 'icon-rotate', options.value);
        }

        function update_map() {
            rotate_plane(yaw_info);
        }

        map_event.on('update', update_map);

        map.on('click', 'okegawa_point', function(e) {
            map.flyTo({
                center: e.features[0].geometry.coordinates,
                zoom: 13,
                speed: 0.9,
                curve: 1,
                easing: function(t) {
                    return t
                }
            });
        });
        let map_canvas = map.getCanvas();
        map.on('mouseenter', 'okegawa_point', function() {
            map_canvas.style.cursor = 'pointer';
        });
        map.on('mouseleave', 'okegawa_point', function() {
            map_canvas.style.cursor = '';
        });
    });

    map.on('error', function(err) {}); // エラーが発生してもエラーメッセージを表示しない
}

function import_error(err) {
    console.log(err);
    dialog.showMessageBox({
        title: "Import Error",
        type: "error",
        buttons: ["OK"],
        message: "Import Error",
        detail: "Unable to Import Map Data."
    });
}

function import_mbtiles() {
    dialog.showOpenDialog({
        title: "Import MBTiles",
        properties: ["openFile", "treatPackageAsDirectory"],
        filters: [{
            name: "MBTiles",
            extensions: ["mbtiles"]
        }]
    }, function(src_file) {
        if (src_file) {
            let file_path = src_file[0];
            if (!fs.existsSync(tilesDir)) {
                fs.mkdirSync(tilesDir);
            }
            mv(file_path, path.join(tilesDir, path.basename(file_path)), function(err) {
                if (err) import_error(err);
                else attempt_map_load();
            });
        }
    });
};

function attempt_map_load() {
    fs.readdir(tilesDir, function(err, item) {
        let MBTiles = require('@mapbox/mbtiles');
        tile_urls = new Array();
        let invalid_data = new Array();
        let index = 0;
        let mdata;

        function validate(err, name) {
            if (err) invalid_data.push(item[index]);
            else tile_urls.push(serverLocation + "/" + mapFilename + "/" + path.parse(item[index]).name + "/{z}/{x}/{y}.pbf");
            index++;
        }

        function display_popups() {
            if (invalid_data.length > 0) {
                let invalids = "";
                for (let i = 0; i < invalid_data.length; i++) invalids += invalid_data[i] + "\n";
                dialog.showMessageBox({
                    title: "Invalid Map Data Files Found",
                    type: "error",
                    buttons: ["OK"],
                    message: "Invalid Map Data Files Found",
                    detail: invalids
                }, function(res) {
                    if (!fs.existsSync(path.join(tilesDir, "invalids"))) {
                        fs.mkdirSync(path.join(tilesDir, "invalids"));
                    }
                    for (let i = 0; i < invalid_data.length; i++) {
                        mv(path.join(tilesDir, invalid_data[i]), path.join(tilesDir, "invalids", invalid_data[i]), function(err) {
                            if (err) {
                                console.log("mv", err)
                            }
                        });
                    }
                });
            }
            if (tile_urls.length < 1) {
                $('#dragdrop_layover').html("Import your .mbtiles file here");
                dialog.showMessageBox({
                    title: "Missing Map Tiles",
                    type: "error",
                    buttons: ["Ignore", "Import"],
                    message: "Missing Map Tiles",
                    detail: "Supported data type: mbtiles"
                }, function(res) {
                    if (res == 1) import_mbtiles();
                });
            } else {
                map_loader.emit('load');
            }
        }

        function validate_all() {
            if (item) {
                if (index >= item.length) display_popups();
                else if (path.parse(item[index]).ext == ".mbtiles") {
                    new MBTiles(path.join(tilesDir, item[index]), function(err, mbtiles) {
                        mbtiles.getTile(0, 0, 0, function(err, tile, headers) {
                            validate(err, tile);
                            validate_all();
                        })
                    });
                } else {
                    index++;
                    validate_all();
                }
            } else display_popups();
        }

        validate_all();
    });
};

let plane_width = 128;
let plane_image = new Uint8Array(plane_width * plane_width * 4);
for (let i = 0; i < plane_width; i++) {
    for (let j = 0; j < plane_width; j++) {
        let offset = (j * plane_width + i) * 4;
        if ((i >= 61 && i <= 66) || (j >= 23 && j <= 28)) {
            plane_image[offset + 0] = 255;
            plane_image[offset + 1] = 0;
            plane_image[offset + 2] = 0;
            plane_image[offset + 3] = 255;
        }
    }
}

function setup_map() {
    console.log("setup map");
    let drag_drop = document.getElementById("map_dragdrop");
    let import_map_node = document.getElementById("import-map-button");
    drag_drop.addEventListener('click', import_mbtiles);
    import_map_node.addEventListener('click', import_mbtiles);
    drag_drop.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        for (let f of e.dataTransfer.files) {
            if (path.parse(f.path).ext == ".mbtiles") {
                if (!fs.existsSync(tilesDir)) {
                    fs.mkdirSync(tilesDir);
                }
                mv(f.path, path.join(tilesDir, path.basename(f.path)), function(err) {
                    if (err) import_error(err)
                    else attempt_map_load();
                });
            } else import_error();
        }
    });
    map_loader.on('load', draw_map);
    attempt_map_load();
}