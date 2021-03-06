import valid_casrns from "../../valid_casrns.js";

let qstResponse = {
  data: [
    {
      id: "markush-query",
      type: "queryStructureType",
      attributes: {
        label: "Markush-Query"
      }
    },
    {
      id: "ill-defined",
      type: "queryStructureType",
      attributes: {
        label: "Ill Defined"
      }
    },
    {
      id: "deprecated",
      type: "queryStructureType",
      attributes: {
        name: "deprecated",
        label: "Deprecated",
        deprecated: true
      }
    }
  ]
};

describe("The substance form", () => {
  beforeEach(() => {
    cy.server();
    cy.adminLogin();
    cy.visit("/substance");
  });
  it("should validate inputs", () => {
    cy.get("#casrn").type("not a casrn");
    cy.get("#save-substance-btn").click();
    cy.get("#feedback-casrn").contains(
      "The proposed CASRN does not conform to the regular expression ^[0-9]{2,7}-[0-9]{2}-[0-9]$"
    );
  });
  it("should show unsaved changes", () => {
    cy.get("#casrn").type("not a casrn");
    cy.get("#feedback-casrn").contains("This field has unsaved changes.");
  });
  it("should validate nonFieldErrors", () => {
    let casrn = valid_casrns[Math.floor(Math.random() * valid_casrns.length)];
    cy.get("#preferredName").type(casrn);
    cy.get("#displayName").type(casrn);
    cy.get("#casrn").type(casrn);
    cy.get("#qcLevel").select("QC Level 1");
    cy.get("#source").select("Source 1");
    cy.get("#substanceType").select("Substance Type 1");
    cy.get("#save-substance-btn").click();
    cy.get("#feedback-preferredName").contains("not unique");
    cy.get("#feedback-displayName").contains("not unique");
    cy.get("#feedback-casrn").contains("not unique");
  });
  it("should save valid substance", () => {
    cy.route({
      method: "POST",
      url: "/substances",
      status: 201,
      response: {
        data: {
          id: "DTXSID502000000"
        }
      }
    }).as("post");
    let casrn = valid_casrns[Math.floor(Math.random() * valid_casrns.length)];
    cy.get("#preferredName").type("preferred substance name");
    cy.get("#displayName").type("substance display name");
    cy.get("#casrn").type(casrn);
    cy.get("#qcLevel").select("QC Level 1");
    cy.get("#source").select("Source 1");
    cy.get("#substanceType").select("Substance Type 1");
    cy.get("#save-substance-btn").click();
    cy.get("[data-cy=alert-box]").should(
      "contain",
      "Substance 'DTXSID502000000' created successfully"
    );
    cy.get("@post").should("have.property", "status", 201);
    cy.get("@post")
      .its("request.body.data.attributes.preferredName")
      .should("contain", "preferred substance name");
    cy.get("@post")
      .its("request.body.data.attributes.displayName")
      .should("contain", "substance display name");
    cy.get("@post")
      .its("request.body.data.attributes.casrn")
      .should("contain", casrn);
    cy.get("@post")
      .its("request.body.data.relationships.qcLevel.data.id")
      .should("contain", "1");
    cy.get("@post")
      .its("request.body.data.relationships.source.data.id")
      .should("contain", "1");
    cy.get("@post")
      .its("request.body.data.relationships.substanceType.data.id")
      .should("contain", "1");
  });
  it("should save associatedCompound to substance", () => {
    cy.route({
      method: "PATCH",
      url: "/substances/DTXSID202000099",
      status: 200,
      response: {
        data: {
          id: "DTXSID202000099"
        }
      }
    }).as("post");

    cy.visit("/substance?search=Solo%20substance");
    cy.get("#save-substance-btn").should("be.disabled");
    // Create Compound - Hydrogen Peroxide
    cy.get("#compound-type-dropdown").select("Defined Compound");
    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty")
      .then(cy.wrap)
      .find("#canvas")
      .children()
      .find("text")
      .should("not.exist");

    // Find the oxygen button
    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty")
      .then(cy.wrap)
      .find("#atom")
      .find("button")
      .eq(6)
      .click();

    // Select a point. create a H2O there, click and drag to make H2O2
    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty")
      .then(cy.wrap)
      .find("#canvas")
      // create first node
      .click()
      .find("text")
      .first()
      // select first node
      .trigger("mousedown", { button: 0 })
      // back up to canvas
      .parent()
      // drag to create compound
      .trigger("mousemove", 500, 500, { force: true })
      .trigger("mouseup", { force: true });

    cy.get("#save-substance-btn")
      .should("not.be.disabled")
      .click();
    cy.get("[data-cy=alert-box]").should(
      "contain",
      "Substance 'DTXSID202000099' updated successfully"
    );
  });
  it("should alert on unsaved Compounds", () => {
    cy.get("[data-cy=search-box]").type("Hydrogen Peroxide");
    cy.get("[data-cy=search-button]").click();
    cy.get("#compound-type-dropdown").select("Ill defined");
    cy.get("#feedback-cid").contains(
      "This Compound is not related to the Substance displayed."
    );
  });
  it("should prevent saving Substance when no DTXCID", () => {
    let casrn = valid_casrns[Math.floor(Math.random() * valid_casrns.length)];
    cy.get("#preferredName").type("I am a fake preferredName");
    cy.get("#displayName").type("I am a fake displayName");
    cy.get("#casrn").type(casrn);
    cy.get("#qcLevel").select("QC Level 1");
    cy.get("#source").select("Source 1");
    cy.get("#substanceType").select("Substance Type 1");
    cy.get("#compound-type-dropdown").select("Ill defined");
    cy.get("#save-substance-btn").click();
    cy.get("#feedback-substanceSave").contains(
      "The Compound displayed is not saved. Save changes to the Compound before saving the Substance or set Structure Type to 'None'."
    );
  });
  it("should reset field changes on the Substance Form", () => {
    cy.get("[data-cy=search-box]").type("Hydrogen Peroxide");
    cy.get("[data-cy=search-button]").click();
    cy.get("#preferredName").type("Fake Name");
    cy.get("#reset-substance-btn").click();
    cy.get("#preferredName").should("have.value", "Hydrogen Peroxide");
  });
});

describe("The substance page anonymous access", () => {
  beforeEach(() => {
    cy.server();
    cy.route("/queryStructureTypes*", qstResponse);
    cy.visit("/substance");
  });

  it("should have dropdown", () => {
    cy.get("#compound-type-dropdown").contains("None");
    cy.get("#compound-type-dropdown").contains("Defined Compound");
    cy.get("#compound-type-dropdown").contains("Ill Defined");
    cy.get("#compound-type-dropdown").contains("Markush");
    cy.get("#compound-type-dropdown").should("not.contain", "Deprecated");
  });

  it("should disassociate the compound if saved with qst none selected", () => {
    cy.route({
      method: "PATCH",
      url: "/substances/DTXSID502000000",
      status: 200,
      response: {}
    }).as("patch");

    cy.adminLogin();
    cy.visit("/substance/DTXSID502000000");

    cy.get("button:contains('Save Compound')").should("be.disabled");
    cy.get("#save-substance-btn").should("be.disabled");

    cy.get("#compound-type-dropdown").select("None");

    // Save
    cy.get("#save-substance-btn")
      .should("not.be.disabled")
      .click();

    cy.get("@patch").should("have.property", "status", 200);
    cy.get("@patch")
      .its("request.body.data.relationships.associatedCompound.data")
      .should("be", null);
  });

  it("should toggle ketcher/marvinjs on dropdown", () => {
    cy.get("#compound-type-dropdown").select("Defined Compound");
    cy.get("iframe[id=ketcher]");
    cy.get("#compound-type-dropdown").select("Ill Defined");
    cy.get("iframe[id=marvin]");
  });

  it("should load the substance form from search", () => {
    // Search
    cy.get("[data-cy=search-box]").type("Sample Substance");
    cy.get("[data-cy=search-button]").click();

    cy.get("#recordCompoundID").should("have.value", "DTXCID302000003");
    cy.get("#id").should("have.value", "DTXSID502000000");
    cy.get("#preferredName").should("have.value", "Sample Substance");
    cy.get("#displayName").should("have.value", "Display Sample Substance");
    cy.get("#casrn").should("have.value", "1234567-89-5");
    cy.get("#qcLevel").should("have.value", "qc-level-1");
    cy.get("#source").should("have.value", "source-1");
    cy.get("#substanceType").should("have.value", "substance-type-1");
    cy.get("#description").should(
      "have.value",
      "This is the description for the test substance"
    );
    cy.get("#privateQcNote").should("have.value", "Private QC notes");
    cy.get("#publicQcNote").should("have.value", "Public QC notes");
  });

  it("should load the substance form from tree", () => {
    cy.get("#DTXSID502000000").click({ force: true });
    cy.get("#recordCompoundID").should("have.value", "DTXCID302000003");
    cy.get("#id").should("have.value", "DTXSID502000000");
    cy.get("#preferredName").should("have.value", "Sample Substance");
    cy.get("#displayName").should("have.value", "Display Sample Substance");
    cy.get("#casrn").should("have.value", "1234567-89-5");
    cy.get("#qcLevel").should("have.value", "qc-level-1");
    cy.get("#source").should("have.value", "source-1");
    cy.get("#substanceType").should("have.value", "substance-type-1");
    cy.get("#description").should(
      "have.value",
      "This is the description for the test substance"
    );
    cy.get("#privateQcNote").should("have.value", "Private QC notes");
    cy.get("#publicQcNote").should("have.value", "Public QC notes");
  });

  it("should show substance link with mismatched DTXCID=>DTXSID", () => {
    // Search for the Solo Substance (which has no compound)
    cy.get("[data-cy=search-box]").type("Solo Substance");
    cy.get("[data-cy=search-button]").click();

    // Verify no elements are in the iframe
    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty")
      .then(cy.wrap)
      .find("#canvas")
      .children()
      .find("text")
      .should("not.exist");

    // Create Compound - Hydrogen Peroxide
    cy.get("#compound-type-dropdown").select("Defined Compound");
    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty")
      .then(cy.wrap)
      .find("#canvas")
      .children()
      .find("text")
      .should("not.exist");

    // Find the oxygen button
    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty")
      .then(cy.wrap)
      .find("#atom")
      .find("button")
      .eq(3)
      .click();

    // Select a point. create a H2O there, click and drag to make H2O2
    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty")
      .then(cy.wrap)
      .find("#canvas")
      // create first node
      .click()
      .find("text")
      .first()
      // select first node
      .trigger("mousedown", { button: 0 })
      // back up to canvas
      .parent()
      // drag to create compound
      .trigger("mousemove", 500, 500, { force: true })
      .trigger("mouseup", { force: true });

    // Now h202 is drawn, see if link to existing sub/comp populates
    cy.get("#recordCompoundID").should("have.value", "DTXCID502000024");
    cy.get("#id").should("have.value", "DTXSID202000099");
    cy.get("#substanceLink")
      .should("have.attr", "href")
      // existing SID
      .and("include", "DTXSID202000002");
  });

  it("should load defined compound into ketcher window", () => {
    // Verify no elements are in the iframe
    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty")
      .then(cy.wrap)
      .find("#canvas")
      .children()
      .find("text")
      .should("not.exist");

    // Search
    cy.get("[data-cy=search-box]").type("Sample Substance");
    cy.get("[data-cy=search-button]").click();

    // Verify elements in iframe
    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty")
      .then(cy.wrap)
      .find("#canvas")
      .children()
      .find("text")
      .should("exist");

    cy.get("#substanceInfoPanel")
      .should("contain", "355.4457497596741")
      .should("contain", "C22 H26 F N O2")
      .should("contain", "O=C(CCCN1CCC(C2C=CC(C)=CC=2)(O)CC1)C1C=CC(F)=CC=1")
      .should("contain", "AGAHNABIDCTLHW-UHFFFAOYSA-N");
  });

  it("should handle search exceptions", () => {
    cy.route({
      url: "/substances?filter[search]=Sample Substance",
      response: {
        errors: [{ detail: "The Resolver service is not available right now" }]
      },
      status: 500
    });

    // Search
    cy.get("[data-cy=search-box]").type("Sample Substance");
    cy.get("[data-cy=search-button]").click();

    cy.get("body").should(
      "contain",
      "The Resolver service is not available right now"
    );
  });

  it("should fetch from server when ketcher changes", () => {
    cy.get("#compound-type-dropdown").select("Defined Compound");
    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty")
      .then(cy.wrap)
      .find("#canvas")
      .children()
      .find("text")
      .should("not.exist");

    // Find the oxygen button
    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty")
      .then(cy.wrap)
      .find("#atom")
      .find("button")
      .eq(3)
      .click();

    // Select a point. create a H2O there, click and drag to make H2O2
    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty")
      .then(cy.wrap)
      .find("#canvas")
      // create first node
      .click()
      .find("text")
      .first()
      // select first node
      .trigger("mousedown", { button: 0 })
      // back up to canvas
      .parent()
      // drag to create compound
      .trigger("mousemove", 500, 500, { force: true })
      .trigger("mouseup", { force: true });

    // Check compound loaded
    cy.get("#recordCompoundID").should("have.value", "DTXCID502000024");

    // Check substance not loaded
    cy.get("#id").should("have.value", "");
  });

  it("should load substances without compounds", () => {
    // Navigate to substance with records
    cy.get("[data-cy=search-box]").type("Solo Substance");
    cy.get("[data-cy=search-button]").click();

    // Verify response contains rids as required.
    cy.get("#id").should("have.value", "DTXSID202000099");
  });

  it("bad search should alert invalidity", () => {
    cy.get("[data-cy=search-box]").type("compound 47");
    cy.get("[data-cy=search-button]").click();
    cy.get("[data-cy=alert-box]").should("contain", "compound 47 not valid");
  });

  it("should not have compound data persist", () => {
    // When loading a substance that does not have an associated
    // compound the compound window should not be populated

    // load a Substance that has a Compound
    cy.get("[data-cy=search-box]").type("Sample Substance");
    cy.get("[data-cy=search-button]").click();

    cy.get("#compound-type-dropdown").should("have.value", "definedCompound");

    // load a Substance that has NO Compound
    cy.get("[data-cy=search-box]").clear(); // clear search box
    cy.get("[data-cy=search-box]").type("Solo Substance");
    cy.get("[data-cy=search-button]").click();

    cy.get("#compound-type-dropdown").should("not.have.value");
  });
});

describe("The substance page authenticated access", () => {
  beforeEach(() => {
    cy.adminLogin();
  });
  beforeEach(() => {
    cy.server();
    cy.route("/queryStructureTypes*", qstResponse);
    cy.visit("/substance");
  });

  it("should show depreciated controlled vocabs on the substance form's dropdowns", () => {
    cy.get("[data-cy=search-box]").type("Deprecated Substance");
    cy.get("[data-cy=search-button]").click();

    // Assert substance loaded
    cy.get("#id").should("have.value", "DTXSID502000555");

    // Build assertion info
    let test_data = [
      {
        htmlID: "#qcLevel",
        name: "Deprecated QC Levels",
        id: "deprecated-qc-levels"
      },
      {
        htmlID: "#source",
        name: "Deprecated Source",
        id: "deprecated-source"
      },
      {
        htmlID: "#substanceType",
        name: "Deprecated Substance Type",
        id: "deprecated-substance-type"
      }
    ];

    // Test Dropdowns
    cy.wrap(test_data).each(param => {
      cy.get(param.htmlID).should("contain", param.name);
      cy.get(param.htmlID)
        .find(`[value=${param.id}]`)
        .should("be.selected")
        .should("have.attr", "disabled");
    });
  });

  it("should post not-loaded defined compounds", () => {
    // Watch for posts
    cy.route({
      method: "POST",
      url: "/definedCompounds",
      status: 201,
      response: {}
    }).as("post");

    // Select ill defined compound to access Ketcher
    cy.get("#compound-type-dropdown").select("Defined Compound");

    // Verify ketcher has loaded
    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty");
    // Click Oxygen Button
    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty")
      .then(cy.wrap)
      .find("#atom")
      .find("button")
      .eq(3)
      .click();

    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty")
      .then(cy.wrap)
      .find("#canvas")
      // create first node
      .click();
    // Save
    cy.get("button:contains('Save Compound')")
      .should("not.be.disabled")
      .click();

    // Verify post status and regex for structure
    cy.get("@post").should("have.property", "status", 201);
    cy.get("@post")
      .its("request.body.data.attributes.molfileV3000")
      // This regex accepts only an Oxygen structure
      .should(
        "match",
        new RegExp(
          [
            "",
            / {2}Ketcher.*/,
            "",
            / {2}0 {2}0 {2}0 {5}0 {2}0 {12}999 V3000/,
            /M {2}V30 BEGIN CTAB/,
            /M {2}V30 COUNTS 1 0 0 0 0/,
            /M {2}V30 BEGIN ATOM/,
            /M {2}V30 1 O [0-9]+\.[0-9]+ -*[0-9]+\.[0-9]+ 0.0000 0/, // numeric wildcards for position
            /M {2}V30 END ATOM/,
            /M {2}V30 BEGIN BOND/,
            /M {2}V30 END BOND/,
            /M {2}V30 END CTAB/,
            /M {2}END/
          ]
            .map(r => {
              return r.source;
            })
            .join("\n")
        )
      );
  });

  it("should post not-loaded illdefined compounds", () => {
    // Watch for patches
    cy.route({
      method: "POST",
      url: "/illDefinedCompounds",
      status: 201,
      response: {}
    }).as("post");

    // Select ill defined compound to access Marvin
    cy.get("#compound-type-dropdown").select("Ill Defined");

    // Verify marvin has loaded
    cy.get("iframe[id=marvin]")
      .its("0.contentDocument.body")
      .should("not.be.empty");
    // Click CycloHexane Button
    cy.get("iframe[id=marvin]")
      .its("0.contentDocument.body")
      .find("[title=CycloHexane]")
      .click();
    // Add CycloHexane to the canvas
    cy.get("iframe[id=marvin]")
      .its("0.contentDocument.body")
      .find("canvas#canvas")
      .click();

    // Save
    cy.get("button:contains('Save Compound')")
      .should("not.be.disabled")
      .click();

    // Verify patch status and regex for structure
    cy.get("@post").should("have.property", "status", 201);
    cy.get("@post")
      .its("request.body.data.attributes.mrvfile")
      // This regex accepts only a CycloHexane structure (metadata is excluded from cml tag)
      .should(
        "match",
        new RegExp(
          [
            /<cml.*><MDocument><MChemicalStruct><molecule molID="m1">/,
            /<atomArray><atom id="a1" elementType="C" x2="-0.020833333333333037" y2="1.53999998768"\/>/,
            /<atom id="a2" elementType="C" x2="-1.3545666559968" y2="0.76999999384"\/>/,
            /<atom id="a3" elementType="C" x2="-1.3545666559968" y2="-0.7701866605051737"\/>/,
            /<atom id="a4" elementType="C" x2="-0.020833333333333037" y2="-1.5399999876800003"\/>/,
            /<atom id="a5" elementType="C" x2="1.3128999893301336" y2="-0.7701866605051737"\/>/,
            /<atom id="a6" elementType="C" x2="1.3128999893301336" y2="0.76999999384"\/>/,
            /<\/atomArray><bondArray><bond id="b1" atomRefs2="a1 a2" order="1"\/>/,
            /<bond id="b2" atomRefs2="a1 a6" order="1"\/><bond id="b3" atomRefs2="a2 a3" order="1"\/>/,
            /<bond id="b4" atomRefs2="a3 a4" order="1"\/><bond id="b5" atomRefs2="a4 a5" order="1"\/>/,
            /<bond id="b6" atomRefs2="a5 a6" order="1"\/><\/bondArray><\/molecule><\/MChemicalStruct><\/MDocument><\/cml>/
          ]
            .map(r => {
              return r.source;
            })
            .join("")
        )
      );
  });

  it("should patch loaded illdefined compounds", () => {
    // Watch for patches
    cy.route({
      method: "PATCH",
      url: "/illDefinedCompounds/*",
      status: 200,
      response: {}
    }).as("patch");

    // Verify marvin has loaded
    cy.get("iframe[id=marvin]")
      .its("0.contentDocument.body")
      .should("not.be.empty");

    // Search
    cy.get("[data-cy=search-box]").type("Sample Substance 2");
    cy.get("[data-cy=search-button]").click();
    // Click CycloHexane Button
    cy.get("iframe[id=marvin]")
      .its("0.contentDocument.body")
      .find("[title=CycloHexane]")
      .click();
    // Add CycloHexane to the canvas
    cy.get("iframe[id=marvin]")
      .its("0.contentDocument.body")
      .find("canvas#canvas")
      .click();

    // Save
    cy.get("button:contains('Save Compound')")
      .should("not.be.disabled")
      .click();

    // Verify patch status and regex for structure
    cy.get("@patch").should("have.property", "status", 200);
    cy.get("@patch")
      .its("request.body.data.attributes.mrvfile")
      // This regex wont accept an empty structure but will accept anything else
      // Verifying the exact structure would make this test brittle
      .should("match", /(<cml).*(><MDocument>).+(<\/MDocument><\/cml>)/);
  });

  it("should patch querystructuretype on illdefined compounds", () => {
    cy.route({
      method: "PATCH",
      url: "/illDefinedCompounds/DTXCID502000009",
      status: 200,
      response: {}
    }).as("patch");

    cy.visit("/substance/DTXSID602000001");

    cy.get("button:contains('Save Compound')").should("be.disabled");

    cy.get("#compound-type-dropdown").select("Markush-Query");

    // Save
    cy.get("button:contains('Save Compound')")
      .should("not.be.disabled")
      .click();

    cy.get("@patch").should("have.property", "status", 200);
    cy.get("@patch")
      .its("request.body.data.relationships.queryStructureType.data.id")
      .should("contain", "markush-query");
  });
  it("should reset changes to the Ketcher window", () => {
    // Get Substance w/ Defined Compound
    cy.get("[data-cy=search-box]").type("Hydrogen Peroxide");
    cy.get("[data-cy=search-button]").click();

    // Modify H2O2 so the DTXCID changes
    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty")
      .then(cy.wrap)
      .find("#canvas")
      .children()
      .find("text")
      .should("not.exist");

    // Find the oxygen button
    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty")
      .then(cy.wrap)
      .find("#atom")
      .find("button")
      .eq(6)
      .click();

    // Select a point. add Oxygen
    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty")
      .then(cy.wrap)
      .find("#canvas")
      .click();

    // Changes have been made, Reset should not be disabled
    cy.get("#reset-compound-btn").should("not.be.disabled");

    // The DTXCID Field should change and show it is not associated
    cy.get("#feedback-cid").contains(
      "This Compound is not related to the Substance displayed."
    );

    // Reset Compound Editor Window
    cy.get("#reset-compound-btn").click();

    // The DTXCID for Hydrogen Peroxide should populate
    cy.get("#recordCompoundID").should("have.value", "DTXCID502000024");
  });

  it("should reset changes to the Marvin window", () => {
    // Get Substance w/ Illdefined Compound to modify
    cy.get("[data-cy=search-box]").type("Sample Substance 2");
    cy.get("[data-cy=search-button]").click();

    // Click CycloHexane Button
    cy.get("iframe[id=marvin]")
      .its("0.contentDocument.body")
      .find("[title=CycloHexane]")
      .click();

    // Add CycloHexane to the canvas
    cy.get("iframe[id=marvin]")
      .its("0.contentDocument.body")
      .find("canvas#canvas")
      .click();

    // Reset button enabled
    cy.get("#reset-compound-btn").should("not.be.disabled");

    // Reset Compound
    cy.get("#reset-compound-btn").click();

    // The buttons should be disabled
    cy.get("#reset-compound-btn").should("be.disabled");
    cy.get("button:contains('Save Compound')").should("be.disabled");
  });

  it("confirm navigation away from editor changes", () => {
    cy.get("iframe[id=marvin]")
      .its("0.contentDocument.body")
      .should("not.be.empty");

    // Search
    cy.get("[data-cy=search-box]").type("Sample Substance 2");
    cy.get("[data-cy=search-button]").click();
    // Click CycloHexane Button
    cy.get("iframe[id=marvin]")
      .its("0.contentDocument.body")
      .find("[title=CycloHexane]")
      .click();
    // Add CycloHexane to the canvas
    cy.get("iframe[id=marvin]")
      .its("0.contentDocument.body")
      .find("canvas#canvas")
      .click();

    // Save button enabled
    cy.get("button:contains('Save Compound')").should("not.be.disabled");

    cy.get("div.navbar-brand").click();
    cy.get("div.modal-dialog").contains("Unsaved changes exist");
    cy.get("button:contains('NO')").click();

    // Save button still enabled
    cy.get("button:contains('Save Compound')").should("not.be.disabled");

    cy.get("a:contains('Lists')").click();
    cy.get("button:contains('YES')").click();
    cy.url().should("contain", "/lists");
  });

  it("logout should provide message to user", () => {
    cy.get("[data-cy=user-dropdown]").click();
    cy.get("[data-cy=logout-button]").click();
    cy.get("[data-cy=alert-box]").should(
      "contain",
      "karyn, you are no longer logged in!"
    );
  });
});

describe("The substance page's Synonym Table", () => {
  beforeEach(() => {
    cy.adminLogin();
    cy.visit("/substance");
    cy.server();

    // fixture loading the synonyms
    cy.route("GET", "/synonyms?*", "fx:../responses/synonyms.json");
  });

  it("should show the substance table", () => {
    cy.get("#synonym-table").should("contain.text", "No Rows To Show");
  });

  it("should load synonyms", () => {
    cy.get("[data-cy=search-box]").type("Sample Substance 2");
    cy.get("[data-cy=search-button]").click();
    cy.get("#synonym-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .should("have.length", 8);
  });

  it("should allow editing", () => {
    // Queue a simple success message.  Response is a template, not valid data.
    cy.route("PATCH", "/synonyms/*", {
      data: {
        type: "synonym",
        id: "3",
        attributes: {
          identifier: "Hello World",
          qcNotes: "bc"
        },
        relationships: {
          source: {
            links: {
              self: "http://localhost:8000/synonyms/3/relationships/source",
              related: "http://localhost:8000/synonyms/3/source"
            },
            data: {
              type: "source",
              id: "7"
            }
          },
          substance: {
            links: {
              self: "http://localhost:8000/synonyms/3/relationships/substance",
              related: "http://localhost:8000/synonyms/3/substance"
            },
            data: {
              type: "substance",
              id: "2"
            }
          },
          synonymQuality: {
            links: {
              self:
                "http://localhost:8000/synonyms/3/relationships/synonymQuality",
              related: "http://localhost:8000/synonyms/3/synonymQuality"
            },
            data: {
              type: "synonymQuality",
              id: "8"
            }
          }
        }
      }
    }).as("patch");

    cy.get("[data-cy=search-box]").type("Sample Substance 2");
    cy.get("[data-cy=search-button]").click();

    // Button is enabled
    cy.get("#synonym-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .first()
      .children()
      .within(row => {
        // Find the first row's save button, verify disabled
        cy.wrap(row)
          .eq(5)
          .find("button")
          .should("be.disabled");

        // Find the first row's first cell and type
        cy.wrap(row)
          .first()
          .type("Hello World\n");

        // Save the cell edit
        cy.wrap(row)
          .eq(5)
          .find("button")
          .should("be.enabled")
          .click();
      });

    cy.get("@patch")
      .its("request.body.data.attributes.identifier")
      .should("eq", "Hello World");
  });

  it("should allow deleting", () => {
    // Queue a simple success message.  Response is a template, not valid data.
    cy.route({
      method: "DELETE",
      url: /synonyms\/\d+/,
      status: 204,
      response: ""
    });

    cy.get("[data-cy=search-box]").type("Sample Substance 2");
    cy.get("[data-cy=search-button]").click();

    // This is the number of rows before delete
    let rowCount;

    cy.get("#synonym-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .its("length")
      .then($rowCount => {
        rowCount = $rowCount;
      });

    // Find the first row's delete button, verify enabled and click
    cy.get("#synonym-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .first()
      .children()
      .eq(6)
      .find("button")
      .should("be.enabled")
      .click();

    cy.get("#synonym-alert").should("be.visible");

    cy.get("#synonym-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .its("length")
      .should($newRowCount => {
        // Verify row count after delete is one less than the rows before change
        expect($newRowCount).to.equal(rowCount - 1);
      });
  });

  it("should allow adding new synonyms", () => {
    // Queue a simple success message (actual response is not currently used)
    cy.route({
      method: "POST",
      url: "/synonyms",
      status: 201,
      response: {
        data: {
          id: "9",
          type: "synonym",
          attributes: {
            identifiers: "Synonym 9",
            qcNotes: ""
          },
          relationships: {
            source: {
              links: {
                self: "http://localhost:8000/synonyms/3/relationships/source",
                related: "http://localhost:8000/synonyms/3/source"
              },
              data: {
                type: "source",
                id: "7"
              }
            },
            substance: {
              links: {
                self:
                  "http://localhost:8000/synonyms/3/relationships/substance",
                related: "http://localhost:8000/synonyms/3/substance"
              },
              data: {
                type: "substance",
                id: "2"
              }
            },
            synonymQuality: {
              links: {
                self:
                  "http://localhost:8000/synonyms/3/relationships/synonymQuality",
                related: "http://localhost:8000/synonyms/3/synonymQuality"
              },
              data: {
                type: "synonymQuality",
                id: "8"
              }
            },
            synonymType: {
              links: {
                self:
                  "http://localhost:8000/synonyms/3/relationships/synonymType",
                related: "http://localhost:8000/synonyms/3/synonymType"
              },
              data: {
                type: "synonymType",
                id: "5"
              }
            }
          }
        }
      }
    }).as("post");

    cy.get("[data-cy=search-box]").type("Sample Substance 2");
    cy.get("[data-cy=search-button]").click();

    // Click the add button
    cy.get("#synonym-add-button")
      .should("be.enabled")
      .click();

    // Find the newly added row's first cell and type
    cy.get("#synonym-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row].new-ag-row")
      .first()
      .find("div[col-id='data.identifier_1']")
      .type("Synonym 9");

    cy.get("#synonym-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row].new-ag-row")
      .first()
      .find("div[col-id='data.source_1']")
      .dblclick();
    cy.get("#synonym-table")
      .find("select")
      .select("down indeed other 4");

    cy.get("#synonym-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row].new-ag-row")
      .first()
      .find("div[col-id='data.synonymQuality_1']")
      .dblclick();
    cy.get("#synonym-table")
      .find("select")
      .select("area professor fromage");

    cy.get("#synonym-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row].new-ag-row")
      .first()
      .find("div[col-id='data.synonymType_1']")
      .dblclick();
    cy.get("#synonym-table")
      .find("select")
      .select("capital performance 4");

    // Click Save
    cy.get("#synonym-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row].new-ag-row")
      .first()
      .children()
      .eq(5)
      .find("button")
      .click();

    cy.get("#synonym-alert").should("be.visible");

    cy.get("@post")
      .its("request.body.data")
      .should("deep.eq", {
        type: "synonym",
        attributes: {
          identifier: "Synonym 9",
          qcNotes: ""
        },
        relationships: {
          source: {
            data: {
              type: "source",
              id: "down-indeed-other-4"
            }
          },
          synonymType: {
            data: {
              type: "synonymType",
              id: "capital-performance-4"
            }
          },
          synonymQuality: {
            data: {
              type: "synonymQuality",
              id: "area-professor-fromage"
            }
          },
          substance: {
            data: {
              type: "substance",
              id: "DTXSID602000001"
            }
          }
        }
      });
  });

  it("should not show deprecated data", () => {
    // Queue a simple success message (actual response is not currently used)
    cy.route("PATCH", "/synonyms/*", "success");

    cy.get("[data-cy=search-box]").type("Deprecated Substance");
    cy.get("[data-cy=search-button]").click();

    // Build assertion info
    let test_data = [
      { column_number: 1, depreciated_label: "Depreciated Source" },
      {
        column_number: 2,
        depreciated_label: "Depreciated Synonym Quality"
      },
      { column_number: 3, depreciated_label: "Depreciated Synonym Type" }
    ];

    // Test Dropdowns
    cy.wrap(test_data).each(param => {
      cy.get("#synonym-table")
        .find("div.ag-center-cols-clipper")
        .find("div.ag-row[role=row]")
        .first()
        .children()
        .eq(param.column_number)
        .dblclick({ force: true });
      cy.get("#synonym-table")
        .find("option")
        .should("not.contain", param.depreciated_label);
    });
  });

  it("should handle errors", () => {
    let sampleErrorMessage = "Sample Error";

    // Queue a failure response
    cy.route({
      method: "PATCH",
      url: "/synonyms/*",
      status: 400,
      response: {
        errors: [
          {
            code: "invalid",
            detail: sampleErrorMessage,
            status: "400",
            source: { pointer: "/data/attributes/nonFieldErrors" }
          }
        ]
      }
    });

    cy.get("[data-cy=search-box]").type("Sample Substance 2");
    cy.get("[data-cy=search-button]").click();

    // Find the first row's first cell and type
    cy.get("#synonym-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .first()
      .children()
      .first()
      .type("Hello World\n");

    // Save Row
    cy.get("#synonym-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .first()
      .children()
      .eq(5)
      .find("button")
      .click();

    // Relocate the first row and select
    cy.get("#synonym-table")
      .should("not.contain.text", "Loading...")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .should("have.class", "bg-danger")
      .first()
      .children()
      .first()
      .click();

    cy.get("#synonym-error-table").should("contain.text", sampleErrorMessage);
  });

  it("should bulk add synonyms", () => {
    cy.route({
      method: "POST",
      url: "/synonyms",
      status: 201,
      response: {}
    }).as("synonymPost");

    cy.get("[data-cy=search-box]").type("Sample Substance 2");
    cy.get("[data-cy=search-button]").click();

    // Open Modal
    cy.get("button:contains('Bulk Add Synonyms')").click();

    cy.get("div[id='bulk-add-synonyms-modal']")
      .find("select")
      .eq(0)
      .select("down indeed other 4");
    cy.get("div[id='bulk-add-synonyms-modal']")
      .find("select")
      .eq(1)
      .select("cost imagine 0");
    cy.get("div[id='bulk-add-synonyms-modal']")
      .find("select")
      .eq(2)
      .select("capital performance 4");

    cy.get("div[id='bulk-add-synonyms-modal']")
      .find("textarea")
      .type("Test Synonym 1\nTest Synonym 2");

    cy.get("div[id='bulk-add-synonyms-modal']")
      .find("button:contains('Save')")
      .click();

    cy.get("div[id='bulk-add-synonyms-modal']")
      .find("div[role='alert']:contains('All Identifiers Saved')")
      .should("exist")
      // Search for "synonymPost" alias requests.  There should be 2
      .then(() => {
        expect(
          cy.state("requests").filter(call => call.alias === "synonymPost")
        ).to.have.length(2);
      });
  });

  it("should handle bulk add synonyms errors", () => {
    cy.route({
      method: "POST",
      url: "/synonyms",
      status: 400,
      response: {
        errors: [
          {
            code: "invalid",
            detail: "Error Message",
            status: "400",
            source: { pointer: "/data/attributes/nonFieldErrors" }
          }
        ]
      }
    }).as("synonymPost");

    cy.get("[data-cy=search-box]").type("Sample Substance 2");
    cy.get("[data-cy=search-button]").click();

    // Open Modal
    cy.get("button:contains('Bulk Add Synonyms')").click();

    cy.get("div[id='bulk-add-synonyms-modal']")
      .find("select")
      .eq(0)
      .select("down indeed other 4");
    cy.get("div[id='bulk-add-synonyms-modal']")
      .find("select")
      .eq(1)
      .select("cost imagine 0");
    cy.get("div[id='bulk-add-synonyms-modal']")
      .find("select")
      .eq(2)
      .select("capital performance 4");

    cy.get("div[id='bulk-add-synonyms-modal']")
      .find("textarea")
      .type("Test Synonym 1\nTest Synonym 2");

    cy.get("div[id='bulk-add-synonyms-modal']")
      .find("button:contains('Save')")
      .click();
    // Search for "post" alias requests

    cy.get("div[id='bulk-add-synonyms-modal']")
      .find(
        "div[role='alert']:contains('The below identifiers were not saved. Review the errors and reattempt.')"
      )
      .should("exist")
      .then(() => {
        expect(
          cy.state("requests").filter(call => call.alias === "synonymPost")
        ).to.have.length(2);
      });

    cy.get("div[id='bulk-add-synonyms-modal']")
      .find("table")
      .should("be.visible");
  });
});

describe("The substance page's Relationships Table", () => {
  beforeEach(() => {
    cy.adminLogin();
    cy.visit("/substance");
    cy.server();
  });

  it("should show the relationships table", () => {
    cy.get("#substance-relationship-table").should(
      "contain.text",
      "No Rows To Show"
    );
  });

  it("should load relationships", () => {
    // Navigate to substance with relationships
    cy.get("[data-cy=search-box]").type("Sample Substance 2");
    cy.get("[data-cy=search-button]").click();

    // Verify response contains sids as required.
    cy.get("#substance-relationship-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .should("have.length", 3)
      .should("contain", "DTXSID502000000")
      .should("contain", "DTXSID602000001")
      .should("contain", "DTXSID202000002");
  });

  it("should allow editing (forward and reverse)", () => {
    // Queue a simple success message.  Response is a template, not valid data.
    cy.route({
      method: "PATCH",
      url: "/substanceRelationships/*",
      status: 200,
      response: {} // currently unneeded
    }).as("patch");

    cy.get("[data-cy=search-box]").type("Sample Substance 2");
    cy.get("[data-cy=search-button]").click();

    // Button is disabled
    cy.get("#substance-relationship-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .first()
      .children()
      .eq(4)
      .find("button")
      .should("be.disabled");

    // Find the first row's first cell and type (SID cell)
    cy.get("#substance-relationship-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .first()
      .children()
      .eq(1)
      .type("Hello World\n");

    // Change to forward relationship type.  (Relationship Type cell)
    cy.get("#substance-relationship-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .first()
      .find("div[col-id='data.relationshipType']")
      .dblclick();
    cy.get("#substance-relationship-table")
      .find("select")
      .select("central many throw 3");

    // Save the cell edit
    cy.get("#substance-relationship-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .first()
      .children()
      .eq(4)
      .find("button")
      .should("be.enabled")
      .click();

    // Verify fake sid is in "toSubstance" relationship
    cy.get("@patch")
      .its("request.body.data.relationships.toSubstance.data.id")
      .should("eq", "Hello World");

    // Change to reverse relationship type.  (Relationship Type cell)
    cy.get("#substance-relationship-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .first()
      .find("div[col-id='data.relationshipType']")
      .dblclick();
    cy.get("#substance-relationship-table")
      .find("select")
      .select(
        "Field paper tree where she. Plant project range research be especially half."
      );

    // Save the cell edit
    cy.get("#substance-relationship-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .first()
      .children()
      .eq(4)
      .find("button")
      .should("be.enabled")
      .click();

    // Verify fake sid is in "fromSubstance" relationship
    cy.get("@patch")
      .its("request.body.data.relationships.fromSubstance.data.id")
      .should("eq", "Hello World");
  });

  it("should allow adding new substance relationships (forward & reverse)", () => {
    // Queue a simple success message (actual response is not currently used)
    cy.route({
      method: "POST",
      url: "/substanceRelationships",
      status: 201,
      response: {} // currently unneeded
    }).as("post");

    cy.get("[data-cy=search-box]").type("Sample Substance 2");
    cy.get("[data-cy=search-button]").click();

    // Click the add button
    cy.get("#relationship-add-button")
      .should("be.enabled")
      .click();

    // Find the newly added row's first cell and type
    cy.get("#substance-relationship-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row].new-ag-row")
      .first()
      .find("div[col-id='data.relatedSubstanceId']")
      .type("example-dtxsid");

    cy.get("#substance-relationship-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row].new-ag-row")
      .first()
      .find("div[col-id='data.source']")
      .dblclick();
    cy.get("#substance-relationship-table")
      .find("select")
      .select("down indeed other 4");

    cy.get("#substance-relationship-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row].new-ag-row")
      .first()
      .find("div[col-id='data.relationshipType']")
      .dblclick();
    cy.get("#substance-relationship-table")
      .find("select")
      .select("central many throw 3");

    // Click Save
    cy.get("#substance-relationship-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row].new-ag-row")
      .first()
      .children()
      .eq(4)
      .find("button")
      .click();

    cy.get("@post")
      .its("request.body.data")
      .should("deep.eq", {
        type: "substanceRelationship",
        attributes: {
          qcNotes: ""
        },
        relationships: {
          source: {
            data: {
              type: "source",
              id: "down-indeed-other-4"
            }
          },
          relationshipType: {
            data: {
              type: "relationshipType",
              id: "central-many-throw-3"
            }
          },
          toSubstance: {
            data: {
              type: "substance",
              id: "example-dtxsid"
            }
          },
          fromSubstance: {
            data: {
              type: "substance",
              id: "DTXSID602000001"
            }
          }
        }
      });

    // Test reverse relationship
    cy.get("#substance-relationship-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row].new-ag-row")
      .first()
      .find("div[col-id='data.relationshipType']")
      .dblclick();
    cy.get("#substance-relationship-table")
      .find("select")
      .select(
        "Field paper tree where she. Plant project range research be especially half."
      );

    // Click Save
    cy.get("#substance-relationship-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row].new-ag-row")
      .first()
      .children()
      .eq(4)
      .find("button")
      .click();

    cy.get("@post")
      .its("request.body.data")
      .should("deep.eq", {
        type: "substanceRelationship",
        attributes: {
          qcNotes: ""
        },
        relationships: {
          source: {
            data: {
              type: "source",
              id: "down-indeed-other-4"
            }
          },
          relationshipType: {
            data: {
              type: "relationshipType",
              id: "central-many-throw-3"
            }
          },
          fromSubstance: {
            data: {
              type: "substance",
              id: "example-dtxsid"
            }
          },
          toSubstance: {
            data: {
              type: "substance",
              id: "DTXSID602000001"
            }
          }
        }
      });
  });

  it("should allow deleting", () => {
    // Queue a simple success message.  Response is a template, not valid data.
    cy.route({
      method: "DELETE",
      url: /substanceRelationships\/\d+/,
      status: 204,
      response: ""
    });

    cy.get("[data-cy=search-box]").type("Sample Substance 2");
    cy.get("[data-cy=search-button]").click();

    // This is the number of rows before delete
    let rowCount;

    cy.get("#substance-relationship-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .its("length")
      .then($rowCount => {
        rowCount = $rowCount;
      });

    // Find the first row's delete button, verify enabled and click
    cy.get("#substance-relationship-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .first()
      .children()
      .eq(5)
      .find("button")
      .should("be.enabled")
      .click();

    cy.get("#substance-relationship-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .its("length")
      .should($newRowCount => {
        // Verify row count after delete is one less than the rows before change
        expect($newRowCount).to.equal(rowCount - 1);
      });
  });

  it("should not show deprecated data", () => {
    // Queue a simple success message (actual response is not currently used)
    cy.route("PATCH", "/synonyms/*", "success");

    cy.get("[data-cy=search-box]").type("Sample Substance 2");
    cy.get("[data-cy=search-button]").click();

    // Build assertion info
    let test_data = [
      { column_number: 1, depreciated_label: "Depreciated Source" }
    ];

    // Test Dropdowns
    cy.wrap(test_data).each(param => {
      cy.get("#substance-relationship-table")
        .find("div.ag-center-cols-clipper")
        .find("div.ag-row[role=row]")
        .first()
        .children()
        .eq(param.column_number)
        .dblclick({ force: true });
      cy.get("#substance-relationship-table")
        .find("option")
        .should("not.contain", param.depreciated_label);
    });
  });

  it("should handle errors", () => {
    let sampleErrorMessage = "Sample Error";

    // Queue a failure response
    cy.route({
      method: "PATCH",
      url: "/substanceRelationships/*",
      status: 400,
      response: {
        errors: [
          {
            code: "invalid",
            detail: sampleErrorMessage,
            status: "400",
            source: { pointer: "/data/attributes/nonFieldErrors" }
          }
        ]
      }
    });

    cy.get("[data-cy=search-box]").type("Sample Substance 2");
    cy.get("[data-cy=search-button]").click();

    // Find the first row's first cell and type
    cy.get("#substance-relationship-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .first()
      .children()
      .eq(1)
      .type("Hello World\n");

    // Save Row
    cy.get("#substance-relationship-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .first()
      .children()
      .eq(4)
      .find("button")
      .click();

    // Relocate the first row and select
    cy.get("#substance-relationship-table")
      .should("not.contain.text", "Loading...")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .should("have.class", "bg-danger")
      .first()
      .children()
      .eq(1)
      .click();

    cy.get("#relationship-error-table").should(
      "contain.text",
      sampleErrorMessage
    );
  });
});

describe("The substance page's Record Table", () => {
  beforeEach(() => {
    cy.adminLogin();
    cy.visit("/substance");
    cy.server();

    // fixture loading the records
    cy.route("GET", "/records?*", "fx:../responses/records.json");
  });

  it("should show the record table", () => {
    cy.get("#record-table").should("contain.text", "No Rows To Show");
  });

  it("should load records", () => {
    // Navigate to substance with records
    cy.get("[data-cy=search-box]").type("Sample Substance 2");
    cy.get("[data-cy=search-button]").click();

    // Verify response contains rids as required.
    cy.get("#record-table")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .should("have.length", 3)
      .should("contain", "DTXRID602000002")
      .should("contain", "DTXRID002000004")
      .should("contain", "DTXRID702000005");
  });
});

describe("The substance page's Sidebar and Tree View", () => {
  beforeEach(() => {
    cy.adminLogin();
    cy.visit("/substance");
    cy.server();
  });

  it("should have the sidebar button present", () => {
    cy.get("#sidebar")
      .should("be.visible")
      .click();
  });

  it("should not have the sidebar button present", () => {
    // after loading a substance
    cy.get("[data-cy=search-box]").type("Sample Substance 2");
    cy.get("[data-cy=search-button]").click();

    cy.get("#sidebar").should("not.be.visible");
  });
});
