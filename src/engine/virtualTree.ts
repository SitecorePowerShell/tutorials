import type { SitecoreNode } from "../types";

// ============================================================================
// VIRTUAL SITECORE CONTENT TREE
// ============================================================================

const TREE_DATA: { sitecore: SitecoreNode } = {
  sitecore: {
    _id: "{11111111-1111-1111-1111-111111111111}",
    _template: "Root",
    _templateFullName: "System/Root",
    _version: 1,
    _fields: {},
    _children: {
      content: {
        _id: "{0DE95AE4-41AB-4D01-9EB0-67441B7C2450}",
        _template: "Node",
        _templateFullName: "System/Node",
        _version: 1,
        _fields: {},
        _children: {
          Home: {
            _id: "{110D559F-DEA5-42EA-9C1C-8A5DF7E70EF9}",
            _template: "Sample Item",
            _templateFullName: "Sample/Sample Item",
            _version: 2,
            _fields: {
              Title: "Welcome to Sitecore",
              Text: "<p>This is the home page content.</p>",
              __Updated: "20250315T103000Z",
              __Created: "20240601T080000Z",
              "__Updated by": "sitecore\\admin",
            },
            _children: {
              About: {
                _id: "{A2B3C4D5-E6F7-8901-2345-678901234567}",
                _template: "Sample Item",
                _templateFullName: "Sample/Sample Item",
                _version: 1,
                _fields: {
                  Title: "About Us",
                  Text: "<p>Learn more about our company.</p>",
                  __Updated: "20250220T140000Z",
                  __Created: "20240710T090000Z",
                  "__Updated by": "sitecore\\author1",
                },
                _children: {
                  Team: {
                    _id: "{B1111111-1111-1111-1111-111111111111}",
                    _template: "Sample Item",
                    _templateFullName: "Sample/Sample Item",
                    _version: 1,
                    _fields: {
                      Title: "Our Team",
                      Text: "<p>Meet the team behind the product.</p>",
                      __Updated: "20250110T110000Z",
                      __Created: "20240815T100000Z",
                      "__Updated by": "sitecore\\author1",
                    },
                    _children: {},
                  },
                  History: {
                    _id: "{B2222222-2222-2222-2222-222222222222}",
                    _template: "Sample Item",
                    _templateFullName: "Sample/Sample Item",
                    _version: 1,
                    _fields: {
                      Title: "Our History",
                      Text: "<p>Founded in 2003.</p>",
                      __Updated: "20250105T090000Z",
                      __Created: "20240815T103000Z",
                      "__Updated by": "sitecore\\admin",
                    },
                    _children: {},
                  },
                },
              },
              Products: {
                _id: "{C3D4E5F6-7890-1234-5678-901234567890}",
                _template: "Folder",
                _templateFullName: "Common/Folder",
                _version: 1,
                _fields: {
                  __Updated: "20250301T080000Z",
                  __Created: "20240615T120000Z",
                  "__Updated by": "sitecore\\admin",
                },
                _children: {
                  "Product A": {
                    _id: "{D1111111-1111-1111-1111-111111111111}",
                    _template: "Sample Item",
                    _templateFullName: "Sample/Sample Item",
                    _version: 1,
                    _fields: {
                      Title: "Product A",
                      Text: "<p>Our flagship product.</p>",
                      __Updated: "20250310T160000Z",
                      __Created: "20240901T080000Z",
                      "__Updated by": "sitecore\\author2",
                    },
                    _children: {},
                  },
                  "Product B": {
                    _id: "{D2222222-2222-2222-2222-222222222222}",
                    _template: "Sample Item",
                    _templateFullName: "Sample/Sample Item",
                    _version: 1,
                    _fields: {
                      Title: "Product B",
                      Text: "<p>Enterprise solution.</p>",
                      __Updated: "20250228T120000Z",
                      __Created: "20240915T100000Z",
                      "__Updated by": "sitecore\\author2",
                    },
                    _children: {},
                  },
                  "Product C": {
                    _id: "{D3333333-3333-3333-3333-333333333333}",
                    _template: "Sample Item",
                    _templateFullName: "Sample/Sample Item",
                    _version: 1,
                    _fields: {
                      Title: "Product C",
                      Text: "<p>Developer toolkit.</p>",
                      __Updated: "20250120T143000Z",
                      __Created: "20241001T090000Z",
                      "__Updated by": "sitecore\\admin",
                    },
                    _children: {},
                  },
                },
              },
              News: {
                _id: "{E4F5A6B7-C8D9-0123-4567-890123456789}",
                _template: "Folder",
                _templateFullName: "Common/Folder",
                _version: 1,
                _fields: {
                  __Updated: "20250312T090000Z",
                  __Created: "20240701T080000Z",
                  "__Updated by": "sitecore\\admin",
                },
                _children: {
                  "2025 Roadmap": {
                    _id: "{E1111111-1111-1111-1111-111111111111}",
                    _template: "Sample Item",
                    _templateFullName: "Sample/Sample Item",
                    _version: 1,
                    _fields: {
                      Title: "2025 Product Roadmap",
                      Text: "<p>Exciting things ahead.</p>",
                      __Updated: "20250312T090000Z",
                      __Created: "20250105T080000Z",
                      "__Updated by": "sitecore\\author1",
                    },
                    _children: {},
                  },
                  "Sitecore Launch": {
                    _id: "{E2222222-2222-2222-2222-222222222222}",
                    _template: "Sample Item",
                    _templateFullName: "Sample/Sample Item",
                    _version: 1,
                    _fields: {
                      Title: "New Sitecore Features",
                      Text: "<p>Latest platform updates.</p>",
                      __Updated: "20250215T110000Z",
                      __Created: "20241120T100000Z",
                      "__Updated by": "sitecore\\author2",
                    },
                    _children: {},
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

/** Returns a deep clone of the virtual tree so mutable operations get fresh state */
export function createVirtualTree(): { sitecore: SitecoreNode } {
  return JSON.parse(JSON.stringify(TREE_DATA));
}

/** Shared mutable tree instance for the app */
export const VIRTUAL_TREE = TREE_DATA;
