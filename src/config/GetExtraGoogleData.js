const { google } = require('googleapis');

async function getExtraGoogleData(accessToken) {
  // Авторизация через access token
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const people = google.people({ version: 'v1', auth });

  const me = await people.people.get({
    resourceName: 'people/me',
    personFields: 'birthdays,genders'
  });

  // --- Birthday
  let birthday = null;
  if (me.data.birthdays?.length) {
    const b = me.data.birthdays[0].date;
    if (b) {
      const year = b.year || "0000"; // иногда Google скрывает год
      const month = String(b.month).padStart(2, "0");
      const day = String(b.day).padStart(2, "0");
      birthday = `${year}-${month}-${day}`; // формат YYYY-MM-DD
    }
  }

  // --- Gender
  const gender = me.data.genders?.[0]?.value || null;

  return { birthday, gender };
}

module.exports = getExtraGoogleData;
