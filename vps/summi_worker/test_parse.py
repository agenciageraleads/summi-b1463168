import json
from app import _detect_message_shape, _get_in, _get_reaction_text, _get_reaction_target_message_id

payload_update = {
  "event": "messages.update",
  "instance": "lucasborges_5286",
  "data": [
    {
      "key": {
        "remoteJid": "551199999999@s.whatsapp.net",
        "id": "AAAAAAAAAA",
        "fromMe": True
      },
      "update": {
        "pollUpdates": [],
        "message": {
          "reactionMessage": {
            "key": {
              "id": "111111"
            },
            "text": "⚡"
          }
        }
      }
    }
  ]
}

kind, msg = _detect_message_shape(payload_update)
print(f"Update: kind={kind}, msg={msg}")
# _get_in for reaction text:
text = _get_in(payload_update, "data", "update", "message", "reactionMessage", "text")
print(f"_get_in reaction text inside update directly: {text}")

text2 = _get_reaction_text(payload_update)
print(f"_get_reaction_text helper: {text2}")

id2 = _get_reaction_target_message_id(payload_update)
print(f"_get_reaction_target_message_id helper: {id2}")

