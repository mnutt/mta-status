const axios = require('axios');

const key = 'qeqy84JE7hUKfaI0Lxm2Ttcm6ZA0bYrP'; // no idea how long this is good for
const url = `https://collector-otp-prod.camsys-apps.com/realtime/gtfsrt/ALL/alerts?type=json&apikey=${key}`;

const arg = process.argv[1];

function isActive(entity) {
  const activePeriods = entity.alert.active_period || [];
  return activePeriods.some(period => {
    const start = period.start || 0;
    const end = period.end || (Date.now() / 1000 + 1);
    return start < (Date.now() / 1000) && end > (Date.now() / 1000);
  });
}

function isSubway(entity) {
  const informedEntities = entity.alert.informed_entity || [];
  return informedEntities.some(informed => informed.agency_id === "MTASBWY");
}

function lineArg(entity) {
  const arg = process.argv[2];
  if (!arg) {
    return true;
  } else {
    return (entity.alert.informed_entity || []).some(i => i.route_id && i.route_id.toLowerCase() == arg.toLowerCase());
  }
}

(async () => {
  try {
    console.log("Fetching train information...");
    const response = await axios.get(url);
    const data = response.data;
    const entities = data.entity;
    const filteredEntities = entities.filter(isActive).filter(isSubway).filter(lineArg);

    let routes = {};
    if (process.argv[2]) {
      routes[process.argv[2].toUpperCase()] = [];
    } else {
    for (let entity of entities) {
      for (let informed of (entity.alert.informed_entity || [])) {
	if (informed.agency_id === "MTASBWY") {
          routes[informed.route_id] = [];
        }
      }
    }
    }

    for (let entity of filteredEntities) {
      const informedEntities = (entity.alert.informed_entity || []).filter(informed => informed.agency_id === "MTASBWY");
      const routeIds = informedEntities.map(informed => informed.route_id).filter(Boolean);
      for (let routeId of routeIds) {
        routes[routeId] = routes[routeId] || [];
        routes[routeId].push(entity);
      }
    }
    const goodService = Object.entries(routes).filter(([routeId, entities]) => !entities.length);
    if (goodService.length) {
      console.log('');
      console.log(`Good service: ${goodService.map(([routeId])=> routeId).filter(Boolean).join(', ')}`);
      console.log('');
    }

    for (let [routeId, entities] of Object.entries(routes)) {
      if (!entities.length) {
	continue;
      }
      console.log(`${routeId} train status:`);

      if (!entities.length) {
	console.log("  Good service");
      }

      for (let entity of entities) {
        const text = entity.alert.header_text.translation.find(translation => translation.language === 'en').text;
        const activePeriods = entity.alert.active_period.map(period => ({
          start: new Date(period.start * 1000).toLocaleString(),
          end: new Date(period.end * 1000).toLocaleString(),
        }));
        console.log("  " + text);
      }
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
})();
