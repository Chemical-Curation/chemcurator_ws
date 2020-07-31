import Vue from "vue";
import App from "./App.vue";
import "./registerServiceWorker";
import router from "./router";
import store from "./store";
import {
  BootstrapVue,
  IconsPlugin
} from "bootstrap-vue/dist/bootstrap-vue.esm";
import $ from "jquery";  // eslint-disable-line
import "bootstrap/dist/js/bootstrap.min";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";

Vue.config.productionTip = false;
Vue.use(BootstrapVue);
Vue.use(IconsPlugin);

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app");
