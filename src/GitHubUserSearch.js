import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const GITHUB_ACCESS_TOKEN = process.env.REACT_APP_GITHUB_ACCESS_TOKEN;

const GitHubUserSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchTerm) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchTerm]);

  async function searchUsers() {
    try {
      setLoading(true);

      const userArray = [];
      let hasNextPage = true;
      let after = null;

      while (hasNextPage) {
        // Construct the GraphQL query with pagination
        const query = `
          query {
            search(query: "${searchTerm} in:login", type: USER, first: 100, after: ${after || "null"}) {
              edges {
                node {
                  ... on User {
                    login
                    followers {
                      totalCount
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `;

        // Make a request to the GraphQL API
        const response = await axios.post(
          GITHUB_GRAPHQL_URL,
          { query },
          {
            headers: {
              Authorization: `Bearer ${GITHUB_ACCESS_TOKEN}`,
            },
          }
        );

        if (response.status === 200) {
          const data = response.data.data.search;

          if (data.edges.length > 0) {
            // Filter out users with missing follower counts
            const validUsers = data.edges
              .filter(user => user.node.followers && user.node.followers.totalCount !== null)
              .map(user => ({
                login: user.node.login,
                followersCount: user.node.followers.totalCount,
              }));

            userArray.push(...validUsers);
          }

          hasNextPage = data.pageInfo.hasNextPage;
          after = `"${data.pageInfo.endCursor}"`;
        } else {
          console.error(`Error: ${response.status} - ${response.statusText}`);
          break;
        }
      }

      // Sort all users in descending order of followers
      const sortedUsers = userArray.sort((a, b) => b.followersCount - a.followersCount);
      setUsers(sortedUsers);
    } catch (error) {
      console.error('An error occurred:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Search for GitHub users"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {loading && <div>Loading...</div>}
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Followers</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={index}>
              <td>{user.login}</td>
              <td>{user.followersCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default GitHubUserSearch;
