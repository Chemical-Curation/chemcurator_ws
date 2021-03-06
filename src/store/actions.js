// actions
import { HTTP } from "@/store/http-common";

export default {
  getList: async (context, request_details) => {
    let resource = await context.dispatch("getResourceURI");

    context.commit("loading");
    let params_string = "?";
    if (request_details && request_details.params) {
      let param;
      for (param of request_details.params) {
        params_string += `${param.key}=${param.value}&`;
      }
    }

    await HTTP.get("/" + resource + params_string).then(response => {
      context.commit("storeList", response.data.data);
      context.commit("storeCount", response.data.meta.pagination.count);
      if (response.data.included)
        context.commit("storeIncluded", response.data.included);
    });
    await context.commit("loaded");
  },
  getFetch: async (context, id) => {
    let resource = await context.dispatch("getResourceURI");

    await HTTP.get(`/${resource}/${id}`).then(response => {
      context.commit("storeFetch", response.data.data);
    });
  },
  patch: async (context, { id, body }) => {
    let resource = await context.dispatch("getResourceURI");

    return HTTP.patch(`/${resource}/${id}`, { data: { ...body } });
  },
  post: async (context, body) => {
    let resource = await context.dispatch("getResourceURI");

    return HTTP.post(`/${resource}`, { data: { ...body } });
  },
  updateChanged: ({ commit }, val) => {
    commit("setChanged", val);
  }
};
