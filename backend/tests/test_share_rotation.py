def test_every_share_operation_issues_a_fresh_token(client, headers):
    created = client.post("/api/notes", headers=headers, json={"content": "Public version"}).json()
    root = "/api/notes/" + created["note_id"] + "/share"
    first = client.post(root, headers=headers).json()["share_id"]
    second = client.post(root, headers=headers).json()["share_id"]
    assert first != second
    assert client.get("/api/shared/" + first).status_code == 404
    assert client.get("/api/shared/" + second).status_code == 200
