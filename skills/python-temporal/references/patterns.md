# Common Temporal Workflow Patterns

## Saga Pattern

```python
@workflow.defn
class SagaWorkflow:
    @workflow.run
    async def run(self, order_id: str):
        """Saga with compensations"""
        try:
            # Step 1: Reserve inventory
            await workflow.execute_activity(
                reserve_inventory,
                order_id,
                start_to_close_timeout=timedelta(seconds=30),
            )

            # Step 2: Charge payment
            await workflow.execute_activity(
                charge_payment,
                order_id,
                start_to_close_timeout=timedelta(seconds=30),
            )

            # Step 3: Ship order
            await workflow.execute_activity(
                ship_order,
                order_id,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception:
            # Compensate in reverse order
            await workflow.execute_activity(release_inventory, order_id)
            await workflow.execute_activity(refund_payment, order_id)
            raise
```

## Fan-Out/Fan-In

```python
@workflow.defn
class FanOutWorkflow:
    @workflow.run
    async def run(self, items: list[str]):
        """Process items in parallel"""
        # Fan-out: start all activities
        tasks = [
            workflow.execute_activity(
                process_item,
                item,
                start_to_close_timeout=timedelta(seconds=30),
            )
            for item in items
        ]

        # Fan-in: wait for all
        results = await asyncio.gather(*tasks)
        return results
```

## Long-Running Approval

```python
@workflow.defn
class ApprovalWorkflow:
    def __init__(self):
        self.approved = False

    @workflow.run
    async def run(self, request_id: str):
        """Wait for approval (can wait days/weeks)"""
        await workflow.wait_condition(
            lambda: self.approved,
            timeout=timedelta(days=7),
        )

        if self.approved:
            await workflow.execute_activity(process_request, request_id)
        else:
            await workflow.execute_activity(reject_request, request_id)

    @workflow.signal
    def approve(self):
        self.approved = True
```
