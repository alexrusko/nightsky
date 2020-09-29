window.addEventListener('load', function() {
    const timeInput = document.getElementById('timePicker');
    const constellationToggle = document.getElementById('constellation-toggle');
    const skyCanvas = document.getElementById('sky-canvas');
    const constellationCanvas = document.getElementById('constellation-canvas');
    const skyCtx = skyCanvas.getContext('2d');
    const constellationCtx = constellationCanvas.getContext('2d');
    const latInput = document.getElementById('lat');
    const lonInput = document.getElementById('lon');
    const width = 600;
    const starDataParsed = JSON.parse(starData);

    skyCtx.translate(width/2, width/2);
    skyCtx.rotate(-Math.PI / 180 * 90);
    constellationCtx.translate(width/2, width/2);
    constellationCtx.rotate(-Math.PI / 180 * 90);

    let constellationsToggled = false;
    let now = new Date();
    timeInput.value = formatDate(now);
    let lat = 47.4833;
    let lon = 19.0333;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const { coords: { latitude, longitude }} = position;
            lat = latitude;
            lon = longitude;
            latInput.value = lat;
            lonInput.value = lon;
            drawStars();
        }, function() {
            latInput.value = lat;
            lonInput.value = lon;
            drawStars();
        });
    }

    function drawStars() {
        const t1 = performance.now();
        starDataParsed.forEach((data) => {
            const { deDeg, deMinutes, raHours, raMinutes, magnitude, spectralType } = data;
            const { altitude, x, y } = getPosition(raHours, raMinutes, deDeg, deMinutes)
        
            if (altitude > 0 && magnitude < 6) {
                const size = magnitudeToPixels(magnitude);
                const color = spectralTypeToHexColor(spectralType);
                skyCtx.beginPath();
                skyCtx.fillStyle = color;
                skyCtx.shadowColor = color;
                skyCtx.shadowBlur = 5;
                skyCtx.arc(x, y, size, 0, 2 * Math.PI);
                skyCtx.fill();
                skyCtx.closePath();   
            }
        });
        const t2 = performance.now();
        console.log('time: ' + (t2 - t1) + 'millis');
    };

    function magnitudeToPixels(magnitude) {
        if (magnitude < 6 && magnitude >= 5) {
            return 0.25;
        } else if (magnitude < 5 && magnitude >= 4) {
            return 0.5;
        } else if (magnitude < 4 && magnitude >= 2.5) {
            return 1;
        } else if (magnitude < 2.5 && magnitude >= 1.5) {
            return 2;
        } else if (magnitude < 1.5 && magnitude >= 0.5) {
            return 3;
        } else if (magnitude < 0.5 && magnitude >= -0.5) {
            return 4;
        } else if (magnitude < -0.5 && magnitude >= -1.5) {
            return 5;
        } else {
            return 6;
        }
    }

    function spectralTypeToHexColor(spectralType) {
        const spectralClass = spectralType.charAt(0);
        let color = '#fff';
        switch (spectralClass) {
            case 'O':
                color = '#9bb0ff';
                break;
            case 'B':
                color = '#aabfff';
                break;
            case 'A':
                color = '#cad7ff';
                break;
            case 'F':
                color = '#f8f7ff';
                break;
            case 'G':
                color = '#fff4ea';
                break;
            case 'K':
                color = '#ffd2a1';
                break;
            case 'M':
                color = '#ffcc6f';
                break;
        }

        return color;
    };

    function clearStars() {
        skyCtx.clearRect(-width / 2, -width / 2, width, width);
    };

    function drawConstellations() {
        constellations.forEach((constellation) => {
            for (let i = 0; i < constellation.length; i+= 2) {
                const starFrom = starDataParsed.find(star => star.id === constellation[i]);
                const starTo = starDataParsed.find(star => star.id === constellation[i+1]);
                const { x: x1, y: y1, altitude: altitude1 } = getPosition(starFrom.raHours, starFrom.raMinutes, starFrom.deDeg, starFrom.deMinutes);
                const { x: x2, y: y2, altitude: altitude2 } = getPosition(starTo.raHours, starTo.raMinutes, starTo.deDeg, starTo.deMinutes);
                if (altitude1 > 0 && altitude2 > 0) {
                    constellationCtx.beginPath();
                    constellationCtx.moveTo(x1, y1);
                    constellationCtx.lineTo(x2, y2);
                    constellationCtx.strokeStyle = 'white';
                    constellationCtx.lineWidth = 0.5;
                    constellationCtx.shadowBlur = 3;
                    constellationCtx.shadowColor = 'white';
                    constellationCtx.stroke();
                    constellationCtx.closePath();
                }
            }
        });
    };

    function clearConstellations() {
        constellationCtx.clearRect(-width / 2, -width / 2, width, width);
    };

    function reDrawCanvas() {
        clearStars();
        drawStars();
            
        if (constellationsToggled) {
            clearConstellations();
            drawConstellations();
        }
    }

    function getPosition(raHours, raMinutes, deDeg, deMinutes) {
        const raReal  = ra2real( raHours, raMinutes );
        const decReal = dms2real( deDeg, deMinutes );
        const [altitude, azimuth] = coordToHorizon(now, raReal, decReal, lat, lon);
        const radius = 300 * Math.cos(altitude * Math.PI/180);
        const x = radius * Math.cos(azimuth * Math.PI/180);
        const y = radius * Math.sin(azimuth * Math.PI/180);
        return { altitude, azimuth, x, y };
    }

    function ra2real(hr, min) {
        return 15*(hr + min / 60);
    };

    function dms2real(deg, min) {
        return deg < 0 ? deg - min / 60 : deg + min / 60;
    };

    function coordToHorizon(utc, ra, dec, lat, lon) {
        let ha = meanSiderealTime(utc, lon) - ra;
        if (ha < 0) {
            ha = ha + 360;   
        }

        const haRad  = ha*Math.PI/180
        const decRad = dec*Math.PI/180
        const latRad = lat*Math.PI/180

        const sinAlt = Math.sin(decRad)*Math.sin(latRad) + Math.cos(decRad)*Math.cos(latRad)*Math.cos(haRad);
        const alt = Math.asin(sinAlt);
        
        const cosAz = (Math.sin(decRad) - Math.sin(alt)*Math.sin(latRad))/(Math.cos(alt)*Math.cos(latRad));
        const az  = Math.acos(cosAz) * 180/Math.PI;
        const altitude = alt*180/Math.PI;
        const azimuth  = Math.sin(haRad) > 0 ? 360 - az : az;
        
        return [altitude, azimuth];
    };

    function meanSiderealTime(now, lon) {
        let year   = now.getUTCFullYear();
        let month  = now.getUTCMonth() + 1;
        const day    = now.getUTCDate();
        const hour   = now.getUTCHours();
        const minute = now.getUTCMinutes();
        const second = now.getUTCSeconds();

        if ((month == 1) || (month == 2)) {
            year  = year - 1;
            month = month + 12;
        }

        const a = Math.floor(year/100);
        const b = 2 - a + Math.floor(a/4);
        const c = Math.floor(365.25*year);
        const d = Math.floor(30.6001*(month + 1));

        const jd = b + c + d - 730550.5 + day + (hour + minute/60.0 + second/3600.0)/24.0;
        
        const jt = jd/36525.0;

        let mst = 280.46061837 + 360.98564736629*jd + 0.000387933*jt*jt - jt*jt*jt/38710000 + lon;

        if (mst > 0.0) {
            while (mst > 360.0) mst = mst - 360.0;
        } else {
            while (mst < 0.0) mst = mst + 360.0;
        }
            
        return mst;
    };

    function formatDate(date) {
        const y = date.getFullYear();
        const M = date.getMonth() + 1;
        const d = date.getDate();
        const h = date.getHours();
        const m = date.getMinutes();
        const MM = M < 10 ? '0' + M : M;
        const dd = d < 10 ? '0' + d : d;
        const hh = h < 10 ? '0' + h : h;
        const mm = m < 10 ? '0' + m : m;
        return `${y}-${MM}-${dd}T${hh}:${mm}`;
    }

    timeInput.addEventListener('input', function(e) {
        const { value } = e.target;
        if (value) {
            now = new Date(value);
            reDrawCanvas();
        }
    });

    latInput.addEventListener('blur', function(e) {
        const { value } = e.target;
        const parsedValue = parseFloat(value);
        if (lat !== parsedValue) {
            lat = parsedValue;
            reDrawCanvas();
        }
    });

    lonInput.addEventListener('blur', function(e) {
        const { value } = e.target;
        const parsedValue = parseFloat(value);
        if (lon !== parsedValue) {
            lon = parsedValue;
            reDrawCanvas();
        }
    });

    constellationToggle.addEventListener('change', function(e) {
        constellationsToggled = e.target.checked;
        constellationsToggled ? drawConstellations() : clearConstellations();
    });
});
