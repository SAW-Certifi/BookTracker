**Goal:** Build a small web app using **React** for the front end, and **Node.js** for the back end. It must use **MongoDB** to store and update data. The front end should make REST API calls to the back end to create, read, update, and delete (CRUD) records and display them in React.

Please submit your project to a public GitHub repo and provide us with the link.

If any special steps are necessary to get your web app running locally, please include a `README.md` in the root folder of your repo with relevant instructions.

Since the front end and back end must be separated, you can either put the front end and back end into their own folders within the same repo, or you can create separate repos for each.

**What to Build**
Choose a basic concept and implement end-to-end CRUD. Here are some examples:
- Books (title, author, year, rating)
- Movies (title, year, genre, watched)
- Work tasks (title, description, status, due date)

**Tech and Architecture**
- **Front end:** React app (any build tool, but Vite is preferred)
- **Back end:** Node.js app, it can use something like Express, or node's base HTTP module.
- **Database:** MongoDB for persistence. You can use either the native MongoDB driver or Mongoose to interact with Mongo in your code, but Mongoose is preferred.
- **API:** Front end must call your Node API to read/write data.

**Minimum Functionality**
- Create, list, update, and delete your chosen resource.
- Basic client-side form validation and error handling (e.g. required fields).
- Meaningful UI: a list/table view and a simple detail page or edit form.

**Extra Credit (Optional):**
These aren't required, but we'll give bonus points for any of the following:
- **Authentication:** Account registration and login (e.g. JWT), with necessary endpoints being protected.
- **Search/Filter/Pagination** on the list endpoint and UI.
- **Dark mode** that can be toggled.