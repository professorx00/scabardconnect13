const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;


Hooks.on("init", function () {
  console.log(
    "This code runs once the Foundry VTT software begins its initialization workflow."
  );
  Handlebars.registerHelper("bulkImportCheck", function (str) {
    return true
  });
  registerSystemSettings();
});

Hooks.on("ready", function () {
  console.log(
    "This code runs once core initialization is ready and game data is available."
  );
  // const t = new LoginPage();
  // t.render(true)
  // let b = game.settings.get("scabardconnect13", "user");
  game.settings.set("scabardconnect13", "LoginError", "");
});

Hooks.on("getSceneControlButtons", (controls) => {
  const addButton = (control) => {
    control.tools.scabard = {
      name: "scabard",
      title: "Scabard Connect",
      icon: "fas fa-duotone fa-light fa-book-user",
      onChange: () => {
        scabardOpen();
      },
      toggle: true,
    };
  }
  if(game.user){
    addButton(controls.notes);
  }
})



async function scabardLogin(username, apiKey){
  let campaigns= []
  const res = await fetch("https://www.scabard.com/api/v0/campaign", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      accessKey: game.settings.get("scabardconnect13", "apiKey"),
      username: game.settings.get("scabardconnect13", "user"),
    },
  }).then((response) => {
    if (!response.ok) {
      return null;
    }
    return response.json(); // For JSON data
  }).catch(error=>{
    return null;
  })


  if(res){
    campaigns = await res.rows
    return campaigns
  }else{
    return null
  }
}

async function scabardOpen(){
  const t = new LoginPage();
  t.render(true)
}

async function fetchScabardData(uri){
  const res = await fetch("https://www.scabard.com/api/v0/" + uri, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      accessKey: game.settings.get("scabardconnect13", "apiKey"),
      username: game.settings.get("scabardconnect13", "user"),
    },
  }).then((response) => {
    if (!response.ok) {
      return null;
    }
    return response.json(); // For JSON data
  });

  return res
}

function handleCampaignSorting(campaignData) {
  let rows = campaignData.rows
  let Adventures =[];
  let Characters =[];
  let Events =[];
  let Groups =[];
  let Items =[];
  let Places =[];
  let Vehicles =[];
  let Notes =[];

  for (let i = 0; i < rows.length-1; i++){
    let row = rows[i]
    switch (row.concept) {
      case "Adventure":
        Adventures.push(row)
        break;
      case "Character":
        Characters.push(row);
        break;
      case "Event":
        Events.push(row);
        break;
      case "Group":
        Groups.push(row);
        break;
      case "Item":
        Items.push(row);
        break;
      case "Place":
        Places.push(row);
        break;
      case "Vehicle":
        Vehicles.push(row);
        break;
      case "Note":
        Notes.push(row);
        break;
    }
  }

  return {
    Adventures,
    Characters,
    Events,
    Groups,
    Items, 
    Places,
    Vehicles,
    Notes
  }

}

async function _findFolder(concept) {
  const folders = game.folders.filter(
    (f) => f.type === "JournalEntry" && f.flags["scabard"]
  );
  const filteredFolders = folders.filter(
    (folder) => folder.flags.scabard.concept === concept
  );
  return filteredFolders[0] ? filteredFolders[0] : null;
}

async function createPages(
  data,
  id,
  uri,
  imageURL,
  isSecret,
  concept,
  mapURL
){
  const pageContent = [
    data.main.briefSummary,
    data.main.description,
    data.main.secrets,
    data.main.gmSecrets,
  ];
  let pages = [];
  for (let i = 0; i < pageContent.length; i++) {
    // Text, Image,PDF,Video
    let newPage = {
      id: id,
      name: ["Brief Summary", "Description", "Secrets", "GM Secrets"][i],
      type: "text",
      text: { content: pageContent[i] },
      flags: { scabard: { id: id, uri: uri, concept: concept } },
      ownership:
        i === 0 || i === 1 ? { default: isSecret ? 0 : -1 } : { default: 0 },
    };
    pages.push(newPage);
  }
  let imagePage = {
    id: id,
    name: "Image",
    type: "image",
    src: imageURL,
    flags: { scabard: { id: id, uri: uri, concept: concept } },
    ownership: { default: isSecret ? 0 : -1 },
  };

  pages.push(imagePage);
  if (mapURL) {
    let mapPage = {
      id: id,
      name: "Map",
      type: "image",
      src: mapURL,
      flags: { scabard: { id: id, uri: uri, concept: concept } },
      ownership: { default: isSecret ? 0 : -1 },
    };
    pages.push(mapPage);
  }
  return pages;
};

async function _updateExistingEntry(entry, pages, data, isSecret) {
  // Update the entry
  console.log("inside update", entry)
  try {
    const Jpages = entry.toJSON().pages;
    console.log(Jpages)
    let newPages = [];
    Jpages.forEach((h, i) => {
      console.log(h.flags.scabard)
      if (h.flags.scabard) {
        let id = h._id;
        let name = h.name;
        switch (name) {
          case "Brief Summary":
            newPages.push({
              _id: id,
              name: h.name,
              ownership: { default: isSecret ? 0 : -1 },
              ...pages[i],
            });
            break;
          case "Description":
            newPages.push({
              _id: id,
              name: h.name,
              ownership: { default: isSecret ? 0 : -1 },
              ...pages[i],
            });
            break;
          case "Secrets":
            newPages.push({
              _id: id,
              ownership: { default: 0 },
              ...pages[i],
            });
            break;
          case "GM Secrets":
            newPages.push({
              _id: id,
              ownership: { default: 0 },
              ...pages[i],
            });
            break;
          case "Image":
            newPages.push({
              _id: id,
              ownership: { default: isSecret ? 0 : -1 },
              ...pages[i],
            });
            break;
          default:
            newPages.push({
              _id: id,
              name: h.name,
              type: h.type,
              image: h.image,
              text: h.text,
              flags: h.flags,
              ownership: { default: isSecret ? 0 : -1 },
              ...pages[i],
            });
            break;
        }
      }
    });
    console.log(newPages)
    await entry.updateEmbeddedDocuments("JournalEntryPage", newPages);
    
    return entry;
  } catch (err) {
    console.error("error", err);
  }
}

async function createJournal(data, id){
  //Get all the data
  const concept = data.main.concept;
  const isSecret = data.main.isSecret;
  const image = data.main.imageURL;
  const large = data.main.largeImageURL;
  const uri = data.main.uri;

//Create a folder for the Journal
  let folder = await _findFolder(concept);
  if (!folder) {
    folder = await Folder.create({
      name: `Scabard ${concept}`,
      type: "JournalEntry",
      flags: { scabard: {concept: concept} },
    });
  }

  // Make the Journal Pages
 let pages = await createPages(data, id, uri, image, isSecret, concept, large);

 // verify there is no entry
 let entry = game.journal.find((e) => {
   if (e.flags.scabard) {
     return e.flags.scabard.id === id;
   }
 });
 console.log("before Update",entry)
 if (entry) {
   return await _updateExistingEntry(entry, pages, data, isSecret);
 }
 let entries = await JournalEntry.createDocuments([
   {
     id: data.main.id,
     name: data.main.name,
     pages: pages,
     flags: { scabard: { id: id, uri: uri, concept: concept } },
     folder: folder.id,
     ownership: { default: isSecret ? 0 : 2 },
   },
 ]);

 return entries[0];
}

async function refreshCampaignData() {
  let cats = [
    "Adventures",
    "Characters",
    "Events",
    "Groups",
    "Items",
    "Places",
    "Vehicles",
    "Notes",
  ];

  for(let i=0; i<cats.length; i++){
    let cat = cats[i]
    let data = await game.settings.get("scabardconnect13", cat);
    console.log("data")
    await game.settings.set("scabardconnect13", cat + "Filter", data);
  }
}


class LoginPage extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "login-form",
    position: {
      width: 250,
      height: 450,
    },
    window: {
      frame: true,
      positioned: true,
      title: "Scabard Connect Login",
      icon: false,
      minimizable: true,
      resizable: false,
    },
    actions: {
      login: this.handleLogin,
    },
  };

  static PARTS = {
    div: { template: "./modules/scabardconnect13/templates/login.hbs" },
  };

  _prepareContext(options) {

    let username = game.settings.get("scabardconnect13", "user");
    let apiKey = game.settings.get("scabardconnect13", "apiKey");
    let error = game.settings.get("scabardconnect13", "LoginError");

    return {
      username,
      apiKey,
      error
    }
  }

  static async handleLogin(event){
    let username = document.getElementById("username").value;
    let apiKey = document.getElementById("apiKey").value;
    await game.settings.set("scabardconnect13", "user", username);
    await game.settings.set("scabardconnect13", "apiKey", apiKey);
    let campaigns = await scabardLogin(username, apiKey);
    if(campaigns){
      await game.settings.set("scabardconnect13", "campaigns", JSON.stringify(campaigns))
      const mpage = new MenuPage();
      mpage.render(true)
      this.close()
    }else{
      document.getElementById("error").classList.remove("hidden");
    }
  }
}

class MenuPage extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "menu-form",
    position: {
      width: 600,
      height: 600,
    },
    window: {
      frame: true,
      positioned: true,
      title: "Scabard Connect",
      icon: false,
    },
    actions: {
      select: this.handleSelected,
    },
  };

  static PARTS = {
    div: { template: "./modules/scabardconnect13/templates/menuPage.hbs" },
  };

  _prepareContext(options) {
    let username = game.settings.get("scabardconnect13", "user");
    let apiKey = game.settings.get("scabardconnect13", "apiKey");
    let campaigns = JSON.parse(
      game.settings.get("scabardconnect13", "campaigns")
    );
    let selected = 0;
    let campaignKeys = campaigns.map((item, index) => {
      return { key: index, label: item.name };
    });
    return {
      username,
      apiKey,
      campaignKeys,
      selected,
    };
  }

  static async handleSelected(){
    let selected = document.getElementById("CampaignChoice").value;
    let campaigns = JSON.parse(
      game.settings.get("scabardconnect13", "campaigns")
    );
    let campaign = campaigns.filter((item, index) => {
      console.log(index, parseInt(selected), index == parseInt(selected));
      if(index == parseInt(selected)){
        return { key: index, label: item.name, uri: item.uri };
      }
    });
    await game.settings.set("scabardconnect13", "selectedCampaign", campaign[0]);
    let campaignData = await fetchScabardData(campaign[0].uri);
    let data = handleCampaignSorting(campaignData)
    await game.settings.set("scabardconnect13", "Adventures", JSON.stringify(data.Adventures));
    await game.settings.set(
      "scabardconnect13",
      "AdventuresFilter",
      JSON.stringify(data.Adventures)
    );
    await game.settings.set(
      "scabardconnect13",
      "Characters",
      JSON.stringify(data.Characters)
    );
    await game.settings.set(
      "scabardconnect13",
      "CharactersFilter",
      JSON.stringify(data.Characters)
    );
    await game.settings.set(
      "scabardconnect13",
      "Events",
      JSON.stringify(data.Events)
    );
    await game.settings.set(
      "scabardconnect13",
      "EventsFilter",
      JSON.stringify(data.Events)
    );
    await game.settings.set(
      "scabardconnect13",
      "Groups",
      JSON.stringify(data.Groups)
    );
    await game.settings.set(
      "scabardconnect13",
      "GroupsFilter",
      JSON.stringify(data.Groups)
    );
    await game.settings.set(
      "scabardconnect13",
      "Items",
      JSON.stringify(data.Items)
    );
    await game.settings.set(
      "scabardconnect13",
      "ItemsFilter",
      JSON.stringify(data.Items)
    );
    await game.settings.set(
      "scabardconnect13",
      "Places",
      JSON.stringify(data.Places)
    );
    await game.settings.set(
      "scabardconnect13",
      "PlacesFilter",
      JSON.stringify(data.Places)
    );
    await game.settings.set(
      "scabardconnect13",
      "Vehicles",
      JSON.stringify(data.Vehicles)
    );
    await game.settings.set(
      "scabardconnect13",
      "VehiclesFilter",
      JSON.stringify(data.Vehicles)
    );
    await game.settings.set(
      "scabardconnect13",
      "Notes",
      JSON.stringify(data.Notes)
    );
    await game.settings.set(
      "scabardconnect13",
      "NotesFilter",
      JSON.stringify(data.Notes)
    );

    let campaignPage = new CampaignPage();
    campaignPage.render(true)
    this.close()
  };
}

class CampaignPage extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: "campaign-page",
    position: {
      width: 1200,
      height: 700,
    },
    window: {
      frame: true,
      positioned: true,
      title: "Scabard Connect",
      icon: false,
    },
    actions: {
      catBtn: this.handleCatBtn,
      import: this.handleImport,
      bulkChecked: this.handleChecked,
      bulkNotChecked: this.handleNotChecked,
      bulkImport: this.bulkImport,
    },
  };

  static PARTS = {
    div: { template: "./modules/scabardconnect13/templates/campaignPage.hbs" },
  };

  _prepareContext(options) {
    let concepts = [
      "Adventures",
      "Characters",
      "Events",
      "Groups",
      "Items",
      "Places",
      "Vehicles",
      "Notes",
    ];

    let Adventures = JSON.parse(
      game.settings.get("scabardconnect13", "AdventuresFilter")
    );
    let Characters = JSON.parse(
      game.settings.get("scabardconnect13", "CharactersFilter")
    );
    let Events = JSON.parse(game.settings.get("scabardconnect13", "EventsFilter"));
    let Groups = JSON.parse(game.settings.get("scabardconnect13", "GroupsFilter"));
    let Items = JSON.parse(game.settings.get("scabardconnect13", "ItemsFilter"));
    let Places = JSON.parse(game.settings.get("scabardconnect13", "PlacesFilter"));
    let Vehicles = JSON.parse(
      game.settings.get("scabardconnect13", "VehiclesFilter")
    );
    let Notes = JSON.parse(game.settings.get("scabardconnect13", "NotesFilter"));

    return {
      concepts,
      Adventures,
      Characters,
      Events,
      Groups,
      Items,
      Places,
      Vehicles,
      Notes,
    };
  }

  async _onRender(context, options) {
    let all = JSON.parse(game.settings.get("scabardconnect13", "bulkList"));
    all.forEach((uri) => {
      let idChecked = uri + "Check";
      let idNotChecked = uri + "NotCheck";
      let check = document.getElementById(idChecked);
      let notCheck = document.getElementById(idNotChecked);
      if (check) {
        check.classList.remove("hidden");
      }
      if (notCheck) {
        notCheck.classList.add("hidden");
      }
    });

    let cat = await game.settings.get("scabardconnect13", "selectedCategory");

    document.getElementById(cat).classList.remove("hidden");
    document.getElementById(cat+"btn").classList.add("redButton")

    let search = document.getElementById("search")
    search.addEventListener("input", async (e)=>{
      e.preventDefault();
      let term = e.target.value
      let cat = await game.settings.get("scabardconnect13","selectedCategory");
      let data = JSON.parse(await game.settings.get(
        "scabardconnect13",
        cat
      ));
      console.log(cat)
      let filtered = [];
      for(let i=0; i<data.length; i++){
        let lterm = term.toLowerCase();
        let fterm = data[i].name.toLowerCase();
        let uri=data[i].uri
        let el = document.getElementById(uri)
        if(fterm.includes(lterm)){
          filtered.push(data[i])
          el?.classList.remove("hidden")
        }else{
          el?.classList.add("hidden")
        }
      }
      let catFilter = cat+"Filter"
      if(filtered.length>0){
        await game.settings.set("scabardconnect13",catFilter, JSON.stringify(filtered));
      }else{
        await game.settings.set("scabardconnect13", catFilter, JSON.stringify(data));

      }
    })
  }
  static async handleCatBtn(event) {
    let element = event.target;
    let data = element.dataset;
    let cat = data.cat;
    let cats = [
      "Adventures",
      "Characters",
      "Events",
      "Groups",
      "Items",
      "Places",
      "Vehicles",
      "Notes",
    ];
    await game.settings.set("scabardconnect13", "selectedCategory", cat);
    cats.forEach((c) => {
      if (c != cat) {
        document.getElementById(c).classList.add("hidden");
        document.getElementById(c + "btn").classList.remove("redButton");
      } else {
        document.getElementById(cat).classList.remove("hidden");
        document.getElementById(cat + "btn").classList.add("redButton");
      }
    });
  }
  static async handleImport(event) {
    const element = event.target;
    const data = element.dataset;
    const uri = data.uri;

    let scabardData = await fetchScabardData(uri);
    let id = uri.split("/")[4];
    scabardData.id = id;
    await game.settings.set(
      "scabardconnect13",
      "scabardData",
      JSON.stringify(scabardData)
    );
    let importDialog = new ImportDialog();
    importDialog.render(true);
  }
  static async handleNotChecked(event) {
    let target = event.target;
    let data = target.dataset;
    let uri = data.uri;
    let all = JSON.parse(game.settings.get("scabardconnect13", "bulkList"));
    all.push(uri);
    console.log(all);
    game.settings.set("scabardconnect13", "bulkList", JSON.stringify(all));
    let idChecked = uri + "Check";
    let idNotChecked = uri + "NotCheck";
    document.getElementById(idChecked).classList.remove("hidden");
    document.getElementById(idNotChecked).classList.add("hidden");
  }
  static async handleChecked(event) {
    let target = event.target;
    let data = target.dataset;
    let uri = data.uri;
    let all = JSON.parse(game.settings.get("scabardconnect13", "bulkList"));
    let filtered = all.filter((u) => {
      if (u != uri) {
        return u;
      }
    });
    game.settings.set("scabardconnect13", "bulkList", JSON.stringify(filtered));
    let idChecked = uri + "Check";
    let idNotChecked = uri + "NotCheck";
    document.getElementById(idChecked).classList.add("hidden");
    document.getElementById(idNotChecked).classList.remove("hidden");
  }
  static async bulkImport(event){
      let importDialog = new BulkImportDialog()
      importDialog.render(true)
  }
}

class ImportDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "import-form",
    position: {
      width: 400,
      height: 200,
    },
    window: {
      frame: true,
      positioned: true,
      title: "Are you sure?",
      icon: false,
    },
    actions: {
      importBtn: this.handleImport,
      cancelBtn: this.handleCancel,
    },
  };

  static PARTS = {
    div: { template: "./modules/scabardconnect13/templates/importDialog.hbs" },
  };

  _prepareContext(options) {
    const scabardData = JSON.parse(game.settings.get("scabardconnect13", "scabardData"));
    const name = scabardData.main.name
    console.log("name", name)
    return {
      scabardData,
      name
    };
  }
  static async handleCancel(event) {
    this.close()
  }
  static async handleImport(event) {
    const element = event.target;
    const data = element.dataset;
    let id=data.id
    console.log(id)
    let scabardData = JSON.parse(game.settings.get("scabardconnect13", "scabardData"));
    let journal =await createJournal(scabardData, id)
    if(journal){
      this.close()
    }
  }
}

class BulkImportDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "bulk-import-dialog",
    position: {
      width: 400,
      height: 800,
    },
    window: {
      frame: true,
      positioned: true,
      title: "Are you sure?",
      icon: false,
    },
    actions: {
      importBtn: this.handleImport,
      cancelBtn: this.handleCancel,
      remove: this.handleRemove,
    },
  };

  static PARTS = {
    div: { template: "./modules/scabardconnect13/templates/bulkImportDialog.hbs" },
  };

  async _prepareContext(options) {
    let bulkList = JSON.parse(
      await game.settings.get("scabardconnect13", "bulkList")
    );
    let length = bulkList.length
    let sData = [];

    for(let i=0; i<length; i++){
      let scabardData = await fetchScabardData(bulkList[i]);
      console.log(scabardData)
      sData.push(scabardData);
    }

    await game.settings.set("scabardconnect13", "bulkSdataList", JSON.stringify(sData));

    let list = JSON.parse(
      await game.settings.get("scabardconnect13", "bulkSdataList")
    );

    return {
      list
    };
  }

  static async handleCancel(event) {
    let campaign = new CampaignPage()
    campaign.render(true)
    this.close();
  }

  static async handleImport(event) {
    let bulkSdataList = JSON.parse(
      await game.settings.get("scabardconnect13", "bulkSdataList")
    );
    let length = bulkSdataList.length
    for(let i=0; i<length; i++){
      let data = bulkSdataList[i]
      let uri = data.main.uri
      let uriSplit = uri.split("/")
      let id = uriSplit[uriSplit.length-1]
      await createJournal(data, id);
      let idChecked = uri + "Check";
      let idNotChecked = uri + "NotCheck";
      let check = document.getElementById(idChecked);
      let notCheck = document.getElementById(idNotChecked);
      check.classList.add("hidden")
      notCheck.classList.remove("hidden")
    }
    await game.settings.set(
      "scabardconnect13",
      "bulkList",
      "[]"
    );
    await game.settings.set(
      "scabardconnect13",
      "bulkSdataList",
      "[]"
    );
    refreshCampaignData()
    this.close();
  }

  static async handleRemove(event){
    let el = event.target;
    let dataset =  el.dataset;
    let uri = dataset.uri
    let bulkList = JSON.parse(
      await game.settings.get("scabardconnect13", "bulkList")
    );
    let filterList = [];
    let length = bulkList.length;
     for(let i=0; i<length; i++){
      console.log(bulkList[i], uri)
      if(bulkList[i] != uri){
        filterList.push(bulkList[i])
      }
     }
    await game.settings.set("scabardconnect13", "bulkList", JSON.stringify(filterList));
    let idChecked = uri + "Check";
    let idNotChecked = uri + "NotCheck";
    let check = document.getElementById(idChecked);
    let notCheck = document.getElementById(idNotChecked);
    check.classList.add("hidden");
    notCheck.classList.remove("hidden");
    this.render(true)
  }
}



function registerSystemSettings() {
  const modulename = "scabardconnect13";
  game.settings.register(modulename, "user", {
    name: "Scabard Username",
    scope: "world",
    config: true,
    type: new foundry.data.fields.StringField({
      initial: "username",
    }),
  });

  game.settings.register(modulename, "apiKey", {
    name: "Scabard API Key",
    scope: "world",
    config: true,
    type: new foundry.data.fields.StringField({
      initial: "apiKey",
    }),
  });

  game.settings.register(modulename, "scabardData", {
    name: "Scabard API Key",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "selectedCampaign", {
    name: "selectedCampaign",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "selectedCategory", {
    name: "Selected Category",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "Adventures",
    }),
  });

  game.settings.register(modulename, "bulkList", {
    name: "Bulk List",
    scope: "world",
    config: true,
    type: new foundry.data.fields.StringField({
      initial: "[]",
    }),
  });

  game.settings.register(modulename, "bulkSdataList", {
    name: "Bulk Scabard Data List",
    scope: "world",
    config: true,
    type: new foundry.data.fields.StringField({
      initial: "[]",
    }),
  });

  game.settings.register(modulename, "Adventures", {
    name: "Adventures",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "AdventuresFilter", {
    name: "Adventures",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "Characters", {
    name: "Characters",
    scope: "world",
    config: true,
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "CharactersFilter", {
    name: "Characters",
    scope: "world",
    config: true,
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "Events", {
    name: "Events",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "EventsFilter", {
    name: "Events",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "Groups", {
    name: "Groups",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "GroupsFilter", {
    name: "Groups",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "Items", {
    name: "Items",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "ItemsFilter", {
    name: "Items",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "Places", {
    name: "Places",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "PlacesFilter", {
    name: "Places",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "Vehicles", {
    name: "Vehicles",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "VehiclesFilter", {
    name: "Vehicles",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "Notes", {
    name: "Notes",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });
  game.settings.register(modulename, "NotesFilter", {
    name: "Notes",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "LoginError", {
    name: "LoginError",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "campaigns", {
    name: "Campaigns",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });
}