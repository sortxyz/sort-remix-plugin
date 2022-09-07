import { LitElement, html, customElement } from "lit-element";
import { PluginClient } from "@remixproject/plugin";
import { createClient } from "@remixproject/plugin-webview";
import { CompilationFileSources, CompilationResult, Status } from "./utils";
import axios from "axios";

const SORT_API = "http://localhost:5000/v0/submit_abi";

type contract = {
  abi: any[];
};

type ContractMap = {
  [contractName: string]: contract;
};

type dapp = {
  mnemonic: string;
  abi: any[];
};

type dappMap = {
  [name: string]: dapp;
};

@customElement("sort-remix-plugin")
export class SortRemixPlugin extends LitElement {
  /** client to communicate with the IDE */
  private client = createClient(new PluginClient());
  private contracts: ContractMap = {};
  private contractAlerts: any = {};
  private sampleQuery: {} = null;
  private sortapp: dappMap = {};

  constructor() {
    super();
    this.init();
  }

  async init() {
    await this.client.onload();
    this.client.solidity.on(
      "compilationFinished",
      (
        file: string,
        src: CompilationFileSources,
        version: string,
        result: CompilationResult
      ) => {
        if (!result) return;
        this.contracts = this.createContracts(result);
        const status: Status = {
          key: "succeed",
          type: "success",
          title: "New interface generated",
        };
        this.client.emit("statusChanged", status);
        this.requestUpdate();
      }
    );
  }

  /** ⚠️ If you're using LitElement you should disable Shadow Root ⚠️ */
  createRenderRoot() {
    return this;
  }

  createContracts(result: CompilationResult) {
    return Object.keys(result.contracts).reduce((acc, fileName) => {
      const contracts = result.contracts[fileName];
      Object.keys(contracts).forEach(
        (name) => (acc[name] = { abi: contracts[name].abi })
      );
      return acc;
    }, {});
  }

  /** Use One Click Dapp API to generate an interface */
  async generateInterface() {
    try {
      const dappName = (<HTMLInputElement>document.getElementById("dappName"))
        .value;
      if (dappName.trim() === "") {
        throw new Error("Please enter a name for the contract");
      }

      const dappAddress = (<HTMLInputElement>(
        document.getElementById("dappAddress")
      )).value.toLowerCase();
      if (!/^(0x)+[0-9a-fA-F]{40}$/i.test(dappAddress)) {
        throw new Error("Please enter a valid contract address");
      }

      const selectedContractNames = [].slice
        .call(document.querySelectorAll("input[type=checkbox]:checked"))
        .map((checked) => {
          return (<HTMLInputElement>checked).value;
        });
      const combinedAbi = selectedContractNames.reduce((acc, name) => {
        return acc.concat(this.contracts[name].abi);
      }, <any>[]);
      if (combinedAbi.length === 0) {
        throw new Error("Please select at least one contract");
      }

      this.client.emit("statusChanged", {
        key: "loading",
        type: "info",
        title: "Generating ...",
      });
      
      const abi_result = await axios
        .post(SORT_API, {
          name: dappName,
          description: "Created using the Remix plugin for One Click Dapp",
          interface: JSON.stringify(combinedAbi),
          userid: "8c89c6c6-e56b-4368-a407-f040ba4c2b33", // Remix user
          contract_address: dappAddress
        }, { headers: { 'Content-Type': 'application/json' } });

        if (abi_result.data.success == 0) {
          
          if (abi_result.data.errors && 
              abi_result.data.errors.length > 0 &&
              abi_result.data.errors[0].startsWith("ABI already exists")
          ) 
          {
            this.sampleQuery = dappAddress;  
            this.requestUpdate();
          } else {
            throw Error(abi_result.data.errors);
          }

        } else {
          this.sampleQuery = dappAddress;
        }
    } catch (err) {
      //throw Error("Hola 3!!!");
      this.showAlert(err);
    }
  }

  showAlert(err?: string) {
    if (err) {
      const message = `${err}`;
      this.contractAlerts = { message, type: "warning" };
    }
    this.requestUpdate();
  }

  render() {
    const isContracts = Object.keys(this.contracts).length > 0;

    const availableContracts = isContracts
      ? Object.keys(this.contracts).map((name, index) => {
          return html`
            <div class="form-check">
              <input
                class="form-check-input"
                type="checkbox"
                value="${name}"
                id="${index}"
                checked
              />
              <label>
                ${name} [${this.contracts[name].abi.length} functions]
              </label>
            </div>
          `;
        })
      : html`
          <div class="list-group-item">
            None found, please compile a contract using the Solidity Compiler
            tab <img src="./compiler.png" width="30" />
          </div>
        `;

    const form = html`
      <div>
        <div class="form-group">
          <label for="dappContracts">Available Contracts:</label>
          ${availableContracts}
        </div>
        <div class="form-group">
          <label for="dappName">Name: </label>
          <input
            type="text"
            class="form-control"
            id="dappName"
            ?disabled="${!isContracts}"
            value="${Object.keys(this.contracts)[0] || ""}"
          />
        </div>
        <div class="form-group">
          <label for="dappAddress">Deployed Address: </label>
          <input
            type="text"
            class="form-control"
            id="dappAddress"
            placeholder="0xabc..."
            ?disabled="${!isContracts}"
          />
        </div>
        <button
          type="submit"
          style="margin:10px 0 3px 0"
          class="btn btn-lg btn-primary mb-2"
          @click="${() => this.generateInterface()}"
          ?disabled="${!isContracts}"
        >
          Add contract to Sort
        </button>
      </div>
    `;

    const contractAlerts = html`
      <div
        class="alert alert-${this.contractAlerts.type}"
        role="alert"
        ?hidden="${Object.keys(this.contractAlerts).length === 0}"
      >
        ${this
          .contractAlerts.message}
      </div>
    `;

    // ?hidden="${this.sampleQuery}"
    const sampleQuery = html`
      <div 
        ?hidden="${this.sampleQuery == null}"
      >
        <div style="padding-top: 20px;">Visit the <a href="https://sort.xyz/query" target="_blank">sort.xyz query console</a> and use the following sample queries for this contract:</div>
        <div style="background-color: #FFF; padding: 10px; margin: 20px 0px; font-color: #000; font-size: 12px; text-align: left;">
            // Goerli testnet<br />
            Select * from goerli.transaction where t.to='${this.sampleQuery}'
        </div>

        <div style="background-color: #FFF; padding: 10px; margin: 20px 0px; font-color: #000; font-size: 12px; text-align: left;">
            // Ethereum mainnet<br />
            Select * from goerli.transaction where t.to='${this.sampleQuery}'
        </div>
      </div>
    `;

    const dapps = Object.keys(this.sortapp).map((name, index) => {
      return html`
        <div class="card" style="margin-top:7px">
          <div class="card-body" style="padding: 7px">
            <h5 class="card-title">${name}</h5>
            <h6 class="card-subtitle mb-2 text-muted">
              ${this.sortapp[name].abi.length} Functions
            </h6>
          </div>
        </div>
      `;
    });

    return html`
      <style>
        main {
          padding: 10px;
        }
        #alerts {
          margin-top: 20px;
          font-size: 0.8rem;
        }
        .alert {
          animation: enter 0.5s cubic-bezier(0.075, 0.82, 0.165, 1);
        }

        @keyframes enter {
          0% {
            opacity: 0;
            transform: translateY(50px) scaleY(1.2);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scaleY(1);
          }
        }
      </style>
      <main>
        <h4>Add a contract to Sort</h4>
        <div style="margin: 10px 0  0 0">Once the contract has been added to Sort, decoded transactions on Ethereum mainnet and Goerli (testnet) can be queried with SQL at <a href="https://sort.xyz" target="_blank">sort.xyz</a></div>
        <div style="margin: 10px 0  0 0" id="form">${form}</div>
        <div id="alerts" style="margin: 0 0  0 0">${contractAlerts}</div>
        <div id="alerts" style="margin: 0 0  0 0">${sampleQuery}</div>
      </main>
    `;
  }
}
