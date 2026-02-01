# Testing Temporal Workflows

## Test Environment

```python
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker

async def test_workflow():
    """Test workflow in test environment"""
    async with await WorkflowEnvironment.start_time_skipping() as env:
        # Create worker
        async with Worker(
            env.client,
            task_queue="test-queue",
            workflows=[MyWorkflow],
            activities=[my_activity],
        ):
            # Execute workflow
            result = await env.client.execute_workflow(
                MyWorkflow.run,
                "World",
                id="test-workflow",
                task_queue="test-queue",
            )

            assert result == "Hello WORLD"
```

## Activity Mocking

```python
from unittest.mock import Mock

async def test_workflow_with_mock_activity():
    """Mock activity in test"""
    mock_activity = Mock(return_value="MOCKED")

    async with await WorkflowEnvironment.start_time_skipping() as env:
        async with Worker(
            env.client,
            task_queue="test-queue",
            workflows=[MyWorkflow],
            activities=[mock_activity],
        ):
            result = await env.client.execute_workflow(
                MyWorkflow.run,
                "World",
                id="test-workflow",
                task_queue="test-queue",
            )

            assert result == "Hello MOCKED"
```
