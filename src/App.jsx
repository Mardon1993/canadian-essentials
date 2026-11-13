                          </div>
                          <h3>Products in this party</h3>
                          {partyLines.map(line => {
                            const qty = Number(line.quantity) || 0;
                            const cost = Number(line.cost) || 0;
                            const selected = products.find(p => String(p.id) === line.product_id);
                            const selling = line.selling !== "" ? Number(line.selling) :
                              Number(selected?.sale_price_uzs ?? selected?.regular_price_uzs ?? 0);
                            const unitTotal = cost + partyShippingUnit;
                            const profit = selling - unitTotal;
                            return (
                              <div key={line.key} style={{ border: "1px solid #dce3e8", borderRadius: 10, padding: 14, marginBottom: 12 }}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 12 }}>
                                  <p><label>Product</label><select required style={inputStyle} value={line.product_id} onChange={e => changePartyLine(line.key, "product_id", e.target.value)}>
                                    <option value="">Select product</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select></p>
                                  <p><label>Quantity</label><input required type="number" min="1" step="1" style={inputStyle} value={line.quantity} onChange={e => changePartyLine(line.key, "quantity", e.target.value)} /></p>
                                  <p><label>Purchase cost/unit (UZS, tax included)</label><input required type="number" min="0" step="any" style={inputStyle} value={line.cost} onChange={e => changePartyLine(line.key, "cost", e.target.value)} /></p>
                                  <p><label>Selling price/unit (UZS, optional)</label><input type="number" min="0" step="any" style={inputStyle} placeholder={selected ? String(selected.sale_price_uzs ?? selected.regular_price_uzs ?? "") : "From catalogue"} value={line.selling} onChange={e => changePartyLine(line.key, "selling", e.target.value)} /></p>
                                </div>
                                <p className="muted">Total cost/unit: <strong>{money(unitTotal)}</strong> · Estimated profit/unit: <strong>{money(profit)}</strong> · Admin 65%: {money(profit * .65)} · Agent 35%: {money(profit * .35)}</p>
                                {line.id == null && partyLines.length > 1 && <button type="button" onClick={() => setPartyLines(lines => lines.filter(x => x.key !== line.key))}>Remove product</button>}
                              </div>
                            );
                          })}
                          <button type="button" onClick={() => setPartyLines(lines => [...lines, newPartyLine()])}>+ Add another product</button>
                          <hr style={{ margin: "22px 0", border: 0, borderTop: "1px solid #dce3e8" }} />
                          <p><label>Total logistics for entire party (UZS)</label><input required type="number" min="0" step="any" style={inputStyle} value={partyLogistics} onChange={e => setPartyLogistics(e.target.value)} placeholder="Enter after adding all products" /></p>
                          <p><strong>Total units:</strong> {partyUnits} · <strong>Logistics per unit:</strong> {money(partyShippingUnit)}</p>
                          <p><label>Notes (optional)</label><input style={inputStyle} value={partyNotes} onChange={e => setPartyNotes(e.target.value)} /></p>
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <button className="primary-button" disabled={partySaving} type="submit">{partySaving ? "Saving..." : "Save Shipment"}</button>
                            <button type="button" disabled={partySaving} onClick={resetPartyForm}>Cancel</button>
                          </div>
                        </form>
                      )}
                      {partyLocked && <button onClick={resetPartyForm}>Close</button>}
                    </div>
                  )}
                  <div className="panel">
                    <h2>Shipments / Parties</h2>
                    <div className="table-wrapper"><table><thead><tr><th>Party</th><th>Date</th><th>Products</th><th>Units</th><th>Total logistics</th><th>Logistics/unit</th><th>Actions</th></tr></thead>
                      <tbody>{parties.map(party => {
                        const lines = partyItems.filter(x => String(x.party_id) === String(party.id));
                        const units = lines.reduce((sum, x) => sum + Number(x.quantity_purchased || 0), 0);
                        return <tr key={party.id}><td><strong>{party.name}</strong></td><td>{party.shipment_date || "—"}</td><td>{lines.length}</td><td>{units}</td><td>{money(party.logistics_total_uzs)}</td><td>{money(units ? Number(party.logistics_total_uzs || 0) / units : 0)}</td><td><button onClick={() => editParty(party)}><Pencil size={15} /> {partyHasSales(party.id) ? "View" : "Edit"}</button></td></tr>;
                      })}{parties.length === 0 && <tr><td colSpan="7">No shipments yet. Click New Party to begin.</td></tr>}</tbody>
                    </table></div>
                  </div>
                </>
              )}

              {page === "Agents" && (
                <div className="panel">
                  <h2>Agent Management</h2>

                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Agent</th>
                          <th>Status</th>
                          <th>Profit Share</th>
                        </tr>
                      </thead>

                      <tbody>
                        {agents.map((agent) => (
                          <tr key={agent.id}>
                            <td>
                              <strong>
                                {agent.name}
                              </strong>
                            </td>

                            <td>
                              <span className="status">
                                {agent.is_active
                                  ? "Active"
                                  : "Inactive"}
                              </span>
                            </td>

                            <td>
                              See profit settings
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {![
                "Dashboard",
                "Inventory",
                "Shipments",
                "Agents"
              ].includes(page) && (
                <div className="panel">
                  <h2>{page}</h2>

                  <p>
                    This section will be activated
                    after its database operations
                    and financial calculations
                    have been tested.
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
