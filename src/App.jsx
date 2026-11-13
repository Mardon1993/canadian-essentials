
              Sign out
            </button>
          </div>
        </header>

        <section className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                CANADIAN ESSENTIALS
              </p>

              <h1>{page}</h1>

              <p className="subtitle">
                Manage your inventory, agents and
                business operations.
              </p>
            </div>

            {page === "Agents" &&
              role === "admin" && (
                <button
                  className="primary-button"
                  onClick={addAgent}
                >
                  <Plus size={18} />
                  Add Agent
                </button>
              )}

            {page === "Inventory" &&
              role === "admin" && (
                <button
                  className="primary-button"
                  onClick={startAddProduct}
                >
                  <Plus size={18} />
                  Add Product
