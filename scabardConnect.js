const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;


Hooks.on("init", function () {
  console.log(
    "This code runs once the Foundry VTT software begins its initialization workflow."
  );
  registerSystemSettings();
  game.settings.set("scabardconnect13", "LoginError","");
});

Hooks.on("ready", function () {
  console.log(
    "This code runs once core initialization is ready and game data is available."
  );
  // const t = new LoginPage();
  // t.render(true)
  // let b = game.settings.get("scabardconnect13", "user");
  
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
    console.log(campaign)
    await game.settings.set("scabardconnect13", "selectedCampaign", campaign[0]);
    let campaignData = await fetchScabardData(campaign[0].uri);
    let data = handleCampaignSorting(campaignData)
    await game.settings.set("scabardconnect13", "Adventures", JSON.stringify(data.Adventures));
    await game.settings.set(
      "scabardconnect13",
      "Characters",
      JSON.stringify(data.Characters)
    );
    await game.settings.set(
      "scabardconnect13",
      "Events",
      JSON.stringify(data.Events)
    );
    await game.settings.set(
      "scabardconnect13",
      "Groups",
      JSON.stringify(data.Groups)
    );
    await game.settings.set(
      "scabardconnect13",
      "Items",
      JSON.stringify(data.Items)
    );
    await game.settings.set(
      "scabardconnect13",
      "Places",
      JSON.stringify(data.Places)
    );
    await game.settings.set(
      "scabardconnect13",
      "Vehicles",
      JSON.stringify(data.Vehicles)
    );
    await game.settings.set(
      "scabardconnect13",
      "Notes",
      JSON.stringify(data.Notes)
    );

    let campaignPage = new CampaignPage();
    campaignPage.render(true)
    this.close()
  };
}

class CampaignPage extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "campaign-form",
    position: {
      width: 1200,
      height: 500,
    },
    window: {
      frame: true,
      positioned: true,
      title: "Scabard Connect",
      icon: false,
    },
    actions: {
      select: this.handleSelected,
      catBtn: this.handleCatBtn,
      import: this.handleImport,
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
      game.settings.get("scabardconnect13", "Adventures")
    );
    let Characters = JSON.parse(
      game.settings.get("scabardconnect13", "Characters")
    );
    let Events = JSON.parse(game.settings.get("scabardconnect13", "Events"));
    let Groups = JSON.parse(game.settings.get("scabardconnect13", "Groups"));
    let Items = JSON.parse(game.settings.get("scabardconnect13", "Items"));
    let Places = JSON.parse(game.settings.get("scabardconnect13", "Places"));
    let Vehicles = JSON.parse(
      game.settings.get("scabardconnect13", "Vehicles")
    );
    let Notes = JSON.parse(game.settings.get("scabardconnect13", "Notes"));

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
  static async handleCatBtn(event){
    let element = event.target
    let data = element.dataset
    let cat = data.cat
    let cats = [
      "Adventures",
      "Characters",
      "Events",
      "Groups",
      "Items",
      "Places",
      "Vehicles",
      "Notes"
    ]
    cats.forEach(c=>{
      if(c != cat){
        document.getElementById(c).classList.add("hidden");
      }else{
        document.getElementById(cat).classList.remove('hidden')
      }
    })
  }
  static async handleImport(event){
    const element = event.target;
    const data = element.dataset;
    const concept = data.concept;
    const name = data.name;
    const uri = data.uri;

    let scabardData = await fetchScabardData(uri) 
    let id = uri.split('/')[4]
    scabardData.id = id;
    await game.settings.set("scabardconnect13", "scabardData", JSON.stringify(scabardData));
    let importDialog = new ImportDialog();
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
    let scabardData = JSON.parse(game.settings.get("scabardconnect13", "scabardData"));
    let journal =await createJournal(scabardData, id)
    if(journal){
      this.close()
    }
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

  game.settings.register(modulename, "Adventures", {
    name: "selectedCampaign",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "Characters", {
    name: "selectedCampaign",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "Events", {
    name: "selectedCampaign",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "Groups", {
    name: "selectedCampaign",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "Items", {
    name: "selectedCampaign",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "Places", {
    name: "selectedCampaign",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "Vehicles", {
    name: "selectedCampaign",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "Notes", {
    name: "selectedCampaign",
    scope: "world",
    type: new foundry.data.fields.StringField({
      initial: "",
    }),
  });

  game.settings.register(modulename, "LoginError", {
    name: "selectedCampaign",
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