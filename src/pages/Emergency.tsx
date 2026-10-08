import Card from "../components/Card";
export default function Emergency() {
  return (
    <div className="narrow">
      <div className="page-heading">
        <div>
          <span className="eyebrow">REFERENCE</span>
          <h1>Emergency Procedures</h1>
          <p>Sample reference layout</p>
        </div>
        <button onClick={() => window.print()}>Print this page</button>
      </div>
      <div className="callout warning">
        <strong>Demonstration content only</strong>
        <p>
          No approved building procedures or emergency contact numbers were
          supplied. This page is not real-world emergency guidance. Obtain
          current instructions from the actual program and building staff.
        </p>
      </div>
      <Card>
        <h2>Evacuation</h2>
        <p>
          Approved evacuation plan unavailable. Add verified building
          instructions and assembly locations before operational use.
        </p>
        <h2>Shelter guidance</h2>
        <p>
          Approved shelter locations unavailable. Consult the actual building’s
          current emergency plan.
        </p>
        <h2>Contacts</h2>
        <table>
          <thead>
            <tr>
              <th>Contact</th>
              <th>Telephone</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Building security</td>
              <td>TBD — add number</td>
              <td>—</td>
            </tr>
            <tr>
              <td>Program contact · synthetic</td>
              <td>TBD — add number</td>
              <td>
                <a href="mailto:maya@example.com">maya@example.com</a>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
