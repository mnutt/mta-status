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
    const response = await axios.get(url);
    const data = response.data;
    const entities = data.entity;
    const filteredEntities = entities.filter(isActive).filter(isSubway).filter(lineArg);

    let routes = {};
    // return entites grouped by route id
    for (let entity of filteredEntities) {
      const informedEntities = (entity.alert.informed_entity || []).filter(informed => informed.agency_id === "MTASBWY");
      const routeIds = informedEntities.map(informed => informed.route_id).filter(Boolean);
      for (let routeId of routeIds) {
        routes[routeId] = routes[routeId] || [];
        routes[routeId].push(entity);
      }
    }

    for (let [routeId, entities] of Object.entries(routes)) {
      console.log(routeId);
      for (let entity of entities) {
        const text = entity.alert.header_text.translation.find(translation => translation.language === 'en').text;
        const activePeriods = entity.alert.active_period.map(period => ({
          start: new Date(period.start * 1000).toLocaleString(),
          end: new Date(period.end * 1000).toLocaleString(),
        }));
        console.log("  " + text);
        //console.log(activePeriods);
      }
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
})();
