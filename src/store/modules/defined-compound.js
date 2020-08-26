import rootActions from "../actions.js";
import rootMutations from "../mutations.js";
import { substanceForm } from "./compound";

const defaultState = () => {
  return {
    attributes: {},
    relationships: {},
    included: {}
  };
};

const state = defaultState();

// actions
const actions = {
  ...rootActions,
  resourceURI: () => { return "definedCompounds" }
};

const getters = {
  getSubstanceForm: substanceForm
};

// mutations
const mutations = {
  ...rootMutations
};

export default {
  namespaced: true,
  state,
  actions,
  getters,
  mutations
};
