# 🧪 Testing

**Estratégia:** Unit + Integration tests

---

## Frontend Tests

```bash
npm run test            # Run all tests
npm run test:ui         # Interactive UI
npm run test:coverage   # Coverage report
```

**Stack:** Vitest + React Testing Library

**Exemplo:**
```typescript
import { render, screen } from '@testing-library/react';
import { MessageCard } from '@/components/MessageCard';

describe('MessageCard', () => {
  it('renders message', () => {
    render(
      <MessageCard
        id="1"
        content="Test"
        priority="NORMAL"
      />
    );
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

---

## Backend Tests

```bash
cd vps/summi_worker
pytest test_*.py -v
pytest test_*.py --cov=.  # Coverage
```

**Stack:** Pytest + Pytest-asyncio

**Exemplo:**
```python
@pytest.mark.asyncio
async def test_analyze_message():
    result = await analyze_message(
        "Olá, tudo bem?",
        "user-123"
    )
    assert result["priority"] in ["IMPORTANTE", "URGENTE", "NORMAL"]
```

---

## Coverage Targets

- Frontend: 70%+
- Backend: 80%+

---

**Ver também:** [`CONTRIBUTING.md`](./CONTRIBUTING.md) para test requirements.
