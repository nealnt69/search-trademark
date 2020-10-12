let cookie = "";
let session = "";
let resultSearch = {
  key: "",
  value: [],
};

const getCookie = () => cookie;

const getSession = () => session;

const getResult = () => resultSearch;

const setCookie = (newCookie) => {
  cookie = newCookie;
};

const setSession = (newSession) => {
  session = newSession;
};

const setResult = (result) => {
  resultSearch = result;
};

module.exports = {
  getCookie,
  setCookie,
  getResult,
  getSession,
  setSession,
  setResult,
};
