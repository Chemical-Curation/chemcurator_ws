let qstResponse = {
  data: [
    {
      id: 1,
      type: "queryStructureType",
      attributes: {
        label: "Markush"
      }
    },
    {
      id: 2,
      type: "queryStructureType",
      attributes: {
        label: "Ill Defined"
      }
    }
  ]
};

describe("The substance page", () => {
  beforeEach(() => {
    cy.adminLogin();
    cy.server();
    cy.route("/queryStructureTypes*", qstResponse);
    cy.visit("/substance");
  });
  it("should have dropdown", () => {
    cy.get("#compound-type-dropdown").contains("None");
    cy.get("#compound-type-dropdown").contains("Defined Compound");
    cy.get("#compound-type-dropdown").contains("Ill Defined");
    cy.get("#compound-type-dropdown").contains("Markush");
  });
  it("should toggle ketcher/marvinjs on dropdown", () => {
    cy.get("#compound-type-dropdown").select("Defined Compound");
    cy.get("iframe[id=ketcher]");
    cy.get("#compound-type-dropdown").select("Ill Defined");
    cy.get("iframe[id=marvin]");
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
    cy.get("[data-cy=search-box]").type("DTXCID302000003");
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
  });
  it("should post not-loaded defined compounds", () => {
    // Watch for patches
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
    // Add CycloHexane to the canvas
    //    cy.get("iframe[id=ketcher]")
    //      .its("0.contentDocument.body")
    //      .find("canvas#canvas")
    //      .click();

    cy.get("iframe[id=ketcher]")
      .its("0.contentDocument.body")
      .should("not.be.empty")
      .then(cy.wrap)
      .find("#canvas")
      // create first node
      .click();
    // Save
    cy.get("button:contains('Save Defined Compound')")
      .should("not.be.disabled")
      .click();

    // Verify patch status and regex for structure
    cy.get("@post").should("have.property", "status", 201);
    cy.get("@post")
      .its("request.body.data.attributes.molfileV2000")
      // This regex accepts only an Oxygen structure
      .should(
        "match",
        new RegExp(
          [
            "",
            / {2}Ketcher.*1.00000 {5}0.00000 {5}0/,
            "",
            / {2}1 {2}0 {2}0 {5}0 {2}0 {12}999 V2000/,
            / {4}6.5000 {2}-13.4000 {4}0.0000 O {3}0 {2}0 {2}0 {2}0 {2}0 {2}0 {2}0 {2}0 {2}0 {2}0 {2}0 {2}0/,
            /M {2}END/,
            ""
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
    cy.get("button:contains('Save Ill Defined Compound')")
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
    cy.get("[data-cy=search-box]").type("DTXCID502000009");
    cy.get("[data-cy=search-button]").click();

    // Save
    cy.get("button:contains('Save Ill Defined Compound')")
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
      .trigger("mousemove", 500, 500)
      .trigger("mouseup", { force: true });

    // Check compound loaded
    cy.get("#recordCompoundID").should("have.value", "DTXCID502000024");

    // Check substance loaded
    cy.get("#substanceID").should("have.value", "DTXSID202000002");
  });
  it("should load the substance form", () => {
    // Search
    cy.get("[data-cy=search-box]").type("DTXCID302000003");
    cy.get("[data-cy=search-button]").click();

    cy.get("#recordCompoundID").should("have.value", "DTXCID302000003");
    cy.get("#substanceID").should("have.value", "DTXSID502000000");
    cy.get("#preferredName").should("have.value", "Sample Substance");
    cy.get("#casrn").should("have.value", "1234567-89-5");
    cy.get("#qcLevel").should("have.value", "1");
    cy.get("#source").should("have.value", "1");
    cy.get("#substanceType").should("have.value", "1");
    cy.get("#substanceDescription").should(
      "have.value",
      "This is the description for the test substance"
    );
    cy.get("#privateQCNotes").should("have.value", "Private QC notes");
    cy.get("#publicQCNotes").should("have.value", "Public QC notes");
  });
  it("bad search should alert invalidity", () => {
    cy.get("[data-cy=search-box]").type("compound 47");
    cy.get("[data-cy=search-button]").click();
    cy.get("[data-cy=alert-box]").should("contain", "compound 47 not valid");
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
    cy.get("#substanceTable").should("contain.text", "No Rows To Show");
  });

  it("should load synonyms", () => {
    cy.get("[data-cy=search-box]").type("DTXCID502000009");
    cy.get("[data-cy=search-button]").click();
    cy.get("#substanceTable")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .should("have.length", 8);
  });

  it("should allow editing", () => {
    // Queue a simple success message (actual response is not currently used)
    cy.route("PATCH", "/synonyms/*", "success");

    cy.get("[data-cy=search-box]").type("DTXCID502000009");
    cy.get("[data-cy=search-button]").click();

    // Find the first row's first cell and type
    cy.get("#substanceTable")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .first()
      .children()
      .first()
      .type("Hello World\n");

    // Save the cell edit
    cy.get("#synonym-save-button").click();

    cy.get("body").should("contain.text", "All synonyms saved successfully");
  });

  it("should allow handle errors", () => {
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

    cy.get("[data-cy=search-box]").type("DTXCID502000009");
    cy.get("[data-cy=search-button]").click();

    // Find the first row's first cell and type
    cy.get("#substanceTable")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .first()
      .children()
      .first()
      .type("Hello World\n");

    // Save the cell edit
    cy.get("#synonym-save-button").click();

    cy.get("body").should("contain.text", "Some synonyms could not be saved");

    // Relocate the first row and select
    cy.get("#substanceTable")
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

  it("should be able to reset", () => {
    cy.get("[data-cy=search-box]").type("DTXCID502000009");
    cy.get("[data-cy=search-button]").click();

    // Find the first row's first cell and type
    cy.get("#substanceTable")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .first()
      .children()
      .first()
      .type("Hello World\n");

    // Roll back the cell edit
    cy.get("#synonym-reset-button").click();

    // Find the first row's first cell and confirm the rollback
    cy.get("#substanceTable")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .first()
      .children()
      .first()
      .should("contain.text", "Synonym 1");
  });
});

describe("The substance page's Relationships Table", () => {
  beforeEach(() => {
    cy.adminLogin();
    cy.visit("/substance");
    cy.server();

    // fixture loading the synonyms
    cy.route(
      "GET",
      "/substanceRelationships?*",
      "fx:../responses/substance-relationships.json"
    );
  });

  it("should show the relationships table", () => {
    cy.get("#substanceRelationshipTable").should(
      "contain.text",
      "No Rows To Show"
    );
  });

  it("should load relationships", () => {
    // Navigate to substance with relationships
    cy.get("[data-cy=search-box]").type("DTXCID502000009");
    cy.get("[data-cy=search-button]").click();

    // Verify response contains sids as required.
    cy.get("#substanceRelationshipTable")
      .find("div.ag-center-cols-clipper")
      .find("div.ag-row[role=row]")
      .should("have.length", 3)
      .should("contain", "DTXSID502000000")
      .should("contain", "DTXSID602000001")
      .should("contain", "DTXSID202000002");
  });
});
